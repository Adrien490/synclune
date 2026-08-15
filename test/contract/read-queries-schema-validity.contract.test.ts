/**
 * @regression read-queries-schema-validity
 *
 * Pendant READ-side de `transactional-writes-schema-validity` : ce test-là couvre
 * les `data:` des mutations, celui-ci les **arguments de lecture** écrits en ligne
 * — `where`, `select`, `include`, `omit`, `orderBy`, `distinct` — confrontés aux
 * champs déclarés dans `schema.prisma`.
 *
 * ## Le défaut que ce test attrape
 *
 * L'audit schéma V1 (2026-08-05) a droppé `Order.userId` et, avec lui, la relation
 * `Order.user`. Deux lecteurs VIVANTS ont survécu au drop :
 *   · `products/data/get-related-products.ts` — `where: { order: { userId, … } }`
 *     dans le carrousel « produits similaires » ;
 *   · `webhooks/services/checkout-order-processing.service.ts` —
 *     `include: { user: { select: { id: true } } }` sur le fetch de commande du
 *     webhook de paiement.
 *
 * Conséquence en production : `PrismaClientValidationError` à chaque rendu de la
 * page d'accueil / du panier pour le premier (carrousel vide, erreur loggée à
 * chaque requête), et **dans la transaction de traitement du paiement** pour le
 * second — commande encaissée par Stripe mais jamais passée en PAID, donc ni
 * décrément de stock, ni facture, ni email de confirmation.
 *
 * ## Pourquoi aucun garde-fou existant ne le voyait
 *
 * - `pnpm typecheck` **passe**. Le `SelectSubset<T, U>` de Prisma type l'argument
 *   depuis lui-même, et un filtre de relation est un `XOR<…RelationFilter,
 *   …WhereInput>` : l'excess property check ne s'applique à aucun des deux. La
 *   « liste exhaustive des lecteurs rendue par tsc après régénération du client »
 *   est donc PARTIELLE, en silence — même piège que côté écriture.
 * - `catalogue-selects-schema-validity` ne voit que les selects **exportés en
 *   `constants/`** ; ces deux-là sont des littéraux en ligne.
 * - Les suites qui couvrent ces chemins mockent `@/shared/lib/prisma` : aucun
 *   argument n'atteint jamais le validateur.
 *
 * ## L'oracle
 *
 * Scan AST TypeScript (pas de regex : littéraux imbriqués et spreads
 * conditionnels la mettraient en défaut), puis descente RÉCURSIVE dans les
 * relations — c'est la récursion qui distingue ce test du scan de premier niveau
 * du sibling, et sans elle `where: { order: { userId } }` (dont la clé de premier
 * niveau, `order`, est parfaitement valide) resterait invisible.
 *
 * Les spreads (`...notDeleted`) et les arguments non littéraux
 * (`select: PRODUCT_CAROUSEL_SELECT`, `where: buildOrderWhereClause(params)`)
 * sont hors de portée par construction : ils sont couverts respectivement par
 * les constantes de `catalogue-selects-schema-validity` et par leur propre suite.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";

const REPO_ROOT = join(__dirname, "..", "..");

// ---------------------------------------------------------------------------
// Le schéma : champs, cibles de relation, et clés uniques composées
// ---------------------------------------------------------------------------

const schemaSrc = readFileSync(join(REPO_ROOT, "prisma", "schema.prisma"), "utf-8");

interface ModelShape {
	/** `champ -> modèle cible` (null pour un scalaire ou un enum). */
	fields: Map<string, string | null>;
	/**
	 * Clés `@@unique([a, b])` / `@@id([a, b])`, sous le nom que Prisma expose dans
	 * un `where` (`a_b`, ou le `name:` explicite). Ce ne sont pas des champs, mais
	 * ce sont des clés de `where` légitimes.
	 */
	compoundKeys: Set<string>;
}

function parseSchema(): Map<string, ModelShape> {
	const raw = new Map<string, { fields: Map<string, string>; compoundKeys: Set<string> }>();

	for (const model of schemaSrc.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
		const fields = new Map<string, string>();
		const compoundKeys = new Set<string>();

		for (const rawLine of model[2]!.split("\n")) {
			const line = rawLine.replace(/\/\/.*$/, "").trim();
			if (!line || line.startsWith("///")) continue;

			if (line.startsWith("@@")) {
				const block = line.match(/^@@(?:unique|id)\s*\(\s*(?:fields\s*:\s*)?\[([^\]]+)\]([\s\S]*)/);
				if (block) {
					const named = block[2]!.match(/name\s*:\s*"([^"]+)"/);
					compoundKeys.add(
						named
							? named[1]!
							: block[1]!
									.split(",")
									.map((f) => f.trim())
									.join("_"),
					);
				}
				continue;
			}

			const field = line.match(/^(\w+)\s+(\w+)/);
			if (field) fields.set(field[1]!, field[2]!);
		}

		raw.set(model[1]!, { fields, compoundKeys });
	}

	// 2ᵉ passe : un champ dont le type est un modèle est une relation.
	const out = new Map<string, ModelShape>();
	for (const [model, { fields, compoundKeys }] of raw) {
		const resolved = new Map<string, string | null>();
		for (const [name, type] of fields) resolved.set(name, raw.has(type) ? type : null);
		out.set(model, { fields: resolved, compoundKeys });
	}
	return out;
}

const MODELS = parseSchema();

/** `orderItem` -> `OrderItem`. Construit depuis le schéma, donc jamais désynchronisé. */
const ACCESSOR_TO_MODEL = new Map(
	Array.from(MODELS.keys(), (m) => [m.charAt(0).toLowerCase() + m.slice(1), m]),
);

// ---------------------------------------------------------------------------
// Vocabulaire Prisma
// ---------------------------------------------------------------------------

/** Méthodes dont le 1ᵉʳ argument porte des `where`/`select`/`include` au niveau du modèle. */
const QUERY_METHODS = new Set([
	"findMany",
	"findFirst",
	"findFirstOrThrow",
	"findUnique",
	"findUniqueOrThrow",
	"count",
	"aggregate",
	"groupBy",
	"update",
	"updateMany",
	"upsert",
	"delete",
	"deleteMany",
]);

/** Arguments de haut niveau dont les clés sont des champs du modèle. */
const MODEL_SHAPED_ARGS = new Set(["where", "select", "include", "omit", "orderBy", "cursor"]);

/** Combinateurs booléens : même modèle, un cran plus bas. */
const LOGICAL_OPERATORS = new Set(["AND", "OR", "NOT"]);

/** Filtres de relation : la valeur est un `WhereInput` du modèle CIBLE. */
const RELATION_FILTERS = new Set(["some", "every", "none", "is", "isNot"]);

/** Sous-arguments d'une relation dont les clés sont des champs de la CIBLE. */
const NESTED_MODEL_SHAPED = new Set(["where", "select", "include", "omit", "orderBy", "cursor"]);

/** Clés qui ne désignent jamais un champ (agrégats, pagination). */
const NON_FIELD_KEYS = new Set([
	"_count",
	"_sum",
	"_avg",
	"_min",
	"_max",
	"_all",
	"_relevance",
	"take",
	"skip",
	"distinct",
	"having",
	"by",
]);

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

interface Offender {
	file: string;
	line: number;
	model: string;
	path: string;
	key: string;
}

function sourceFiles(): string[] {
	const roots = ["modules", "app", "shared"];
	const out: string[] = [];
	const skipDir = new Set(["node_modules", "generated", "__tests__", ".next"]);

	const walk = (dir: string): void => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (skipDir.has(entry.name)) continue;
				walk(full);
			} else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
				out.push(full);
			}
		}
	};
	for (const root of roots) walk(join(REPO_ROOT, root));
	return out;
}

function keyOf(prop: ts.ObjectLiteralElementLike): string | null {
	// Hors `SpreadAssignment` (`...notDeleted`, dont le contenu n'est pas
	// statiquement connu), tout membre d'un littéral objet porte un `name`.
	if (ts.isSpreadAssignment(prop)) return null;
	const name = prop.name;
	if (ts.isIdentifier(name)) return name.text;
	if (ts.isStringLiteral(name)) return name.text;
	// Clé calculée (`[key]: …`) : pas statiquement connue non plus.
	return null;
}

function valueOf(prop: ts.ObjectLiteralElementLike): ts.Expression | null {
	return ts.isPropertyAssignment(prop) ? prop.initializer : null;
}

/** Un littéral objet, ou chaque littéral objet d'un tableau (`orderBy: [{…}, {…}]`). */
function objectLiterals(node: ts.Expression | null): ts.ObjectLiteralExpression[] {
	if (!node) return [];
	if (ts.isObjectLiteralExpression(node)) return [node];
	if (ts.isArrayLiteralExpression(node)) return node.elements.filter(ts.isObjectLiteralExpression);
	return [];
}

class Scanner {
	readonly offenders: Offender[] = [];

	constructor(
		private readonly file: string,
		private readonly sf: ts.SourceFile,
	) {}

	private report(node: ts.Node, model: string, path: string, key: string): void {
		this.offenders.push({
			file: relative(REPO_ROOT, this.file),
			line: this.sf.getLineAndCharacterOfPosition(node.getStart(this.sf)).line + 1,
			model,
			path,
			key,
		});
	}

	/** Objet dont les clés sont des champs de `model` (`where`, `select`, `orderBy`…). */
	modelShaped(model: string, node: ts.ObjectLiteralExpression, path: string): void {
		const shape = MODELS.get(model);
		if (!shape) return;

		for (const prop of node.properties) {
			const key = keyOf(prop);
			if (key === null) continue;
			const value = valueOf(prop);

			if (LOGICAL_OPERATORS.has(key)) {
				for (const nested of objectLiterals(value)) {
					this.modelShaped(model, nested, `${path}.${key}`);
				}
				continue;
			}

			if (NON_FIELD_KEYS.has(key) || shape.compoundKeys.has(key)) continue;

			const target = shape.fields.get(key);
			if (target === undefined) {
				this.report(prop, model, path, key);
				continue;
			}

			// Scalaire : la valeur est un filtre (`{ gt: 0 }`), `true`, ou un tri.
			if (target === null) continue;

			for (const nested of objectLiterals(value)) {
				this.relationShaped(target, nested, `${path}.${key}`);
			}
		}
	}

	/**
	 * Valeur portée par une clé de relation. Trois formes coexistent :
	 *   · filtre to-many : `{ some: { … } }`
	 *   · sous-requête   : `{ select: { … }, where: { … }, take: 3 }`
	 *   · raccourci to-one : `{ userId: "x", paymentStatus: "PAID" }` ← le P0
	 */
	relationShaped(target: string, node: ts.ObjectLiteralExpression, path: string): void {
		const keys = node.properties.map(keyOf).filter((k): k is string => k !== null);
		const isWrapper = keys.some(
			(k) => RELATION_FILTERS.has(k) || NESTED_MODEL_SHAPED.has(k) || NON_FIELD_KEYS.has(k),
		);

		if (!isWrapper) {
			// Raccourci to-one : les clés sont directement des champs de la cible.
			this.modelShaped(target, node, path);
			return;
		}

		for (const prop of node.properties) {
			const key = keyOf(prop);
			if (key === null) continue;
			if (!RELATION_FILTERS.has(key) && !NESTED_MODEL_SHAPED.has(key)) continue;
			for (const nested of objectLiterals(valueOf(prop))) {
				this.modelShaped(target, nested, `${path}.${key}`);
			}
		}
	}
}

function scanRepo(): { offenders: Offender[]; callSites: number } {
	const offenders: Offender[] = [];
	let callSites = 0;

	for (const file of sourceFiles()) {
		const src = readFileSync(file, "utf-8");
		// Pré-filtre bon marché : la majorité des fichiers ne touchent pas Prisma.
		if (
			!/\b(prisma|tx)\s*\.\s*\w+\s*\.\s*(find|count|aggregate|groupBy|update|upsert|delete)/.test(
				src,
			)
		)
			continue;

		const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
		const scanner = new Scanner(file, sf);

		const visit = (node: ts.Node): void => {
			if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
				const method = node.expression.name.text;
				const receiver = node.expression.expression;

				if (
					QUERY_METHODS.has(method) &&
					ts.isPropertyAccessExpression(receiver) &&
					ts.isIdentifier(receiver.expression) &&
					(receiver.expression.text === "prisma" || receiver.expression.text === "tx")
				) {
					const model = ACCESSOR_TO_MODEL.get(receiver.name.text);
					const arg = node.arguments[0];
					if (model && arg && ts.isObjectLiteralExpression(arg)) {
						callSites++;
						for (const prop of arg.properties) {
							const key = keyOf(prop);
							if (key === null || !MODEL_SHAPED_ARGS.has(key)) continue;
							for (const nested of objectLiterals(valueOf(prop))) {
								scanner.modelShaped(model, nested, `${method}.${key}`);
							}
						}
					}
				}
			}
			ts.forEachChild(node, visit);
		};

		visit(sf);
		offenders.push(...scanner.offenders);
	}

	return { offenders, callSites };
}

// ---------------------------------------------------------------------------

describe("lectures Prisma — validité schéma (@regression read-queries-schema-validity)", () => {
	const { offenders, callSites } = scanRepo();

	it("le scan trouve effectivement des sites de lecture (sanity)", () => {
		// Filet du filet : si le scan casse (renommage de `tx`, refonte de l'AST), il
		// rendrait 0 site et la suite passerait en verrouillant… rien.
		expect(callSites).toBeGreaterThan(50);
		expect(MODELS.get("Order")?.fields.has("email")).toBe(true);
	});

	it("aucun `where`/`select`/`include` ne nomme un champ absent du schéma", () => {
		const lines = offenders.map(
			(o) => `${o.file}:${o.line} — ${o.model} n'a pas de champ « ${o.key} » (${o.path})`,
		);
		expect(lines, `Champs inexistants au schéma :\n${lines.join("\n")}`).toEqual([]);
	});

	describe("contre-épreuve — le scan voit bien les deux formes du P0", () => {
		function scanSnippet(code: string): Offender[] {
			const sf = ts.createSourceFile("probe.ts", code, ts.ScriptTarget.Latest, true);
			const scanner = new Scanner(join(REPO_ROOT, "probe.ts"), sf);
			const visit = (node: ts.Node): void => {
				if (
					ts.isCallExpression(node) &&
					ts.isPropertyAccessExpression(node.expression) &&
					ts.isPropertyAccessExpression(node.expression.expression)
				) {
					const model = ACCESSOR_TO_MODEL.get(node.expression.expression.name.text);
					const arg = node.arguments[0];
					if (model && arg && ts.isObjectLiteralExpression(arg)) {
						for (const prop of arg.properties) {
							const key = keyOf(prop);
							if (key === null || !MODEL_SHAPED_ARGS.has(key)) continue;
							for (const nested of objectLiterals(valueOf(prop))) {
								scanner.modelShaped(model, nested, key);
							}
						}
					}
				}
				ts.forEachChild(node, visit);
			};
			visit(sf);
			return scanner.offenders;
		}

		it("détecte un filtre de relation sur une colonne droppée", () => {
			// La forme exacte du carrousel : la clé de PREMIER niveau (`order`) est
			// valide, c'est un cran plus bas que la colonne n'existe plus.
			const found = scanSnippet(
				`prisma.orderItem.findMany({ where: { order: { userId, paymentStatus: "PAID" } } });`,
			);
			// Schéma lean : `userId` ET `paymentStatus` sont droppés — les deux
			// doivent être signalés.
			expect(found.map((o) => o.key)).toEqual(["userId", "paymentStatus"]);
		});

		it("détecte un `include` sur une relation droppée", () => {
			const found = scanSnippet(
				`tx.order.findUnique({ where: { id }, include: { items: true, user: { select: { id: true } } } });`,
			);
			expect(found.map((o) => o.key)).toEqual(["user"]);
		});

		it("ne signale rien sur une requête valide", () => {
			expect(
				scanSnippet(
					`prisma.product.findMany({
						where: { active: true, variants: { some: { active: true, stock: { gt: 0 } } } },
						select: {
							id: true,
							media: {
								where: { type: "IMAGE" },
								select: { id: true, url: true },
								orderBy: [{ position: "asc" }, { id: "asc" }],
								take: 1,
							},
							variants: {
								select: { id: true, priceCents: true },
								take: 1,
							},
						},
						orderBy: [{ createdAt: "desc" }],
					});`,
				),
			).toEqual([]);
		});
	});
});
