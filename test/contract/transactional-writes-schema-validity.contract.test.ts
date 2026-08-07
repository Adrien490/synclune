/**
 * @regression transactional-writes-schema-validity
 *
 * Verrouille la validité au regard du schéma des **ÉCRITURES** Prisma, pendant
 * write-side de `catalogue-selects-schema-validity` (qui ne couvre que des `select`
 * de lecture, tous exportés en `constants/`).
 *
 * ## Le défaut que ce test attrape
 *
 * L'audit schéma V1 (2026-08-05) a droppé `Refund.currency` et `Refund.updatedAt`.
 * Cinq sites n'ont pas suivi :
 *   · `refund.service.ts`        — `currency:` en `create` + `updatedAt: true` en `select`
 *   · `payment-intent.service.ts` — `currency:` en `create` (auto-refunds)
 *   · `dispute-handlers.ts`       — `currency:` en `create` (chargeback perdu)
 *   · `mark-as-fully-refunded.ts` — `currency:` en `create` (remboursement manuel)
 *
 * Conséquence en production : `PrismaClientValidationError` sur **tout** le flux
 * d'ingestion des remboursements — `charge.refunded` (le chemin nominal
 * Stripe-first), les auto-refunds d'oversell et de sous-facturation, et les
 * chargebacks perdus. La commande bascule `REFUNDED` sans ligne `Refund`, donc
 * sans avoir (Art. 272-I CGI).
 *
 * ## Pourquoi aucun garde-fou existant ne le voyait
 *
 * - `pnpm typecheck` **passe**, y compris en `--incremental false` : le
 *   `SelectSubset<T, U>` de Prisma type `data` et `select` **depuis l'argument
 *   lui-même** (`key extends keyof U ? T[key] : never`), donc les clés
 *   excédentaires IMBRIQUÉES échappent au contrôle. Le payload dégénère, et
 *   l'accès de propriété en aval (`refund.updatedAt.getTime()`) passe avec lui.
 *   ⚠️ C'est ce qui invalide le protocole « on retire la colonne, on régénère le
 *   client, `tsc` rend la liste exhaustive des lecteurs » : il rend une liste
 *   PARTIELLE, en silence.
 * - Les suites qui couvrent ces chemins font toutes `vi.mock("@/shared/lib/prisma")` :
 *   aucun payload n'atteint jamais le validateur.
 * - Les tests d'intégration l'attraperaient, mais ils skippent sans
 *   `INTEGRATION_DATABASE_URL` — donc systématiquement en local.
 *
 * ## Les deux oracles
 *
 * **A. Validateur Prisma réel, sans base.** Prisma valide la requête *côté client,
 * avant d'ouvrir la connexion* : sur un client pointé vers un port fermé, une clé
 * inconnue lève `PrismaClientValidationError` tandis qu'une clé valide échoue sur
 * la connexion. Exact et conscient de l'imbrication — mais il exige un payload
 * matérialisable, donc il ne couvre que les constantes exportées.
 *
 * **B. Scan AST + `schema.prisma`.** Les `data:` des mutations sont des littéraux
 * EN LIGNE, jamais exportés : l'oracle A ne peut pas les atteindre. On les lit donc
 * à la source — AST TypeScript (pas de regex : les littéraux imbriqués et les
 * spreads conditionnels la mettraient en défaut), confrontés aux champs déclarés
 * dans `schema.prisma`. C'est cet oracle-là qui aurait attrapé les 4 `currency:`.
 *
 * Le scan **descend dans les écritures imbriquées** (`items: { create: [...] }`,
 * `createMany.data`) en résolvant le modèle cible depuis le schéma. S'arrêter au
 * premier niveau laisserait passer la moitié d'une dérive de colonnes.
 *
 * **B'. Le même scan, appliqué aux fixtures `*.integration.test.ts`.** Elles
 * écrivent en base réelle, donc le même schéma les gouverne — mais elles étaient
 * exclues (`skipDir` contenait `__tests__`). C'est exactement par là qu'est passée
 * la dérive du 2026-08-05 : `Order.{userId, discountAmount, taxAmount, currency}` et
 * les cinq colonnes fiscales d'`OrderItem` droppées, DOUZE suites continuant de les
 * écrire. Toute la preuve de concurrence du dépôt (FOR UPDATE anti-survente,
 * numérotation gap-free Art. 286 CGI, trigger d'unicité cross-table des avoirs)
 * était morte, et rien ne le disait — le job CI mourait avant, sur `prisma generate`.
 *
 * ⚠️ Ne PAS mocker `@/shared/lib/prisma` ni `@/app/generated/prisma/*` ici : le
 * client réel EST le sujet de l'oracle A.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

import { REFUND_RECORD_SELECT } from "@/modules/webhooks/services/refund.service";

const REPO_ROOT = join(__dirname, "..", "..");

// ---------------------------------------------------------------------------
// Oracle A — validateur Prisma réel sur un port fermé
// ---------------------------------------------------------------------------

const UNREACHABLE_URL = "postgresql://unused:unused@127.0.0.1:1/unreachable";

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: UNREACHABLE_URL }),
});

type Verdict = "schema-invalid" | "schema-valid";

async function verdictOf(run: () => Promise<unknown>): Promise<Verdict> {
	try {
		await run();
		// Injoignable en pratique (le port est fermé) ; si jamais, le payload est valide.
		return "schema-valid";
	} catch (error) {
		return (error as Error).constructor.name.includes("Validation")
			? "schema-invalid"
			: "schema-valid";
	}
}

// ---------------------------------------------------------------------------
// Oracle B — champs déclarés au schéma
// ---------------------------------------------------------------------------

const schemaSrc = readFileSync(join(REPO_ROOT, "prisma", "schema.prisma"), "utf-8");

/**
 * `Modèle -> champs` déclarés dans schema.prisma, **relations comprises** : un
 * `create` légitime passe `order: { connect: … }` ou `items: { create: [...] }`.
 *
 * La seconde carte donne le modèle CIBLE de chaque champ de relation, ce qui
 * permet de descendre dans les payloads imbriqués (cf. `collectPayloadSites`).
 */
function parseSchema(): {
	fields: Map<string, Set<string>>;
	relations: Map<string, Map<string, string>>;
} {
	const fields = new Map<string, Set<string>>();
	const rawTypes = new Map<string, Map<string, string>>();

	for (const model of schemaSrc.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
		const names = new Set<string>();
		const types = new Map<string, string>();
		for (const raw of model[2]!.split("\n")) {
			const line = raw.replace(/\/\/.*$/, "").trim();
			if (!line || line.startsWith("@@") || line.startsWith("///")) continue;
			const f = line.match(/^(\w+)\s+(\w+)/);
			if (f) {
				names.add(f[1]!);
				types.set(f[1]!, f[2]!);
			}
		}
		fields.set(model[1]!, names);
		rawTypes.set(model[1]!, types);
	}

	// Un champ est une relation si son type est lui-même un modèle déclaré.
	const relations = new Map<string, Map<string, string>>();
	for (const [model, types] of rawTypes) {
		const rel = new Map<string, string>();
		for (const [field, type] of types) {
			if (fields.has(type)) rel.set(field, type);
		}
		relations.set(model, rel);
	}

	return { fields, relations };
}

const { fields: MODEL_FIELDS, relations: MODEL_RELATIONS } = parseSchema();

/** `refund` -> `Refund`. Construit depuis le schéma, donc jamais désynchronisé. */
const ACCESSOR_TO_MODEL = new Map(
	Array.from(MODEL_FIELDS.keys(), (m) => [m.charAt(0).toLowerCase() + m.slice(1), m]),
);

/** Mutations dont le premier argument porte un `data` au niveau du modèle. */
const WRITE_METHODS = new Set(["create", "update", "upsert", "updateMany", "createMany"]);

/**
 * Racines Prisma reconnues. `prisma` est le client partagé, `tx` le client
 * transactionnel — c'est la convention du repo, et l'élargir à n'importe quel
 * receveur ferait remonter des `.create()` qui n'ont rien de Prisma.
 */
const PRISMA_ROOTS = new Set(["prisma", "tx"]);

interface WriteSite {
	file: string;
	line: number;
	model: string;
	method: string;
	keys: string[];
}

const SKIP_DIR = new Set(["node_modules", "generated", ".next", "coverage"]);

function walkTs(dir: string, keep: (name: string) => boolean, out: string[]): void {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (SKIP_DIR.has(entry.name)) continue;
			walkTs(full, keep, out);
		} else if (/\.tsx?$/.test(entry.name) && keep(entry.name)) {
			out.push(full);
		}
	}
}

/** Fichiers source à scanner (hors tests, hors généré, hors node_modules). */
function sourceFiles(): string[] {
	const out: string[] = [];
	for (const root of ["modules", "app", "shared"]) {
		walkTs(join(REPO_ROOT, root), (n) => !/\.test\.tsx?$/.test(n) && !/^__tests__$/.test(n), out);
	}
	// Les répertoires `__tests__` sont conservés par `walkTs` (ils portent les
	// fixtures d'intégration) : on filtre les fichiers de test par leur NOM.
	return out.filter((f) => !/\.test\.tsx?$/.test(f));
}

/**
 * Fixtures d'intégration : elles écrivent en base réelle, donc elles sont soumises
 * au même schéma que la production.
 *
 * ⚠️ Elles étaient exclues du scan (`skipDir` contenait `__tests__`) — et c'est
 * exactement par là qu'est passée la dérive du 2026-08-05 : `Order.userId`,
 * `Order.discountAmount`, `Order.taxAmount`, `Order.currency` et les cinq colonnes
 * fiscales d'`OrderItem` ont été droppées, DOUZE suites ont continué de les écrire,
 * et personne ne l'a vu. `tsc` ne peut pas aider (le `SelectSubset` de Prisma type
 * `data` depuis l'argument lui-même), les suites skippent en local sans
 * `INTEGRATION_DATABASE_URL`, et le job CI mourait avant sur `prisma generate`.
 *
 * `test/integration/factories.ts` est inclus : c'est désormais la SSOT des fixtures
 * de commande, donc le seul site à protéger pour toute la famille.
 */
function integrationFixtureFiles(): string[] {
	const out: string[] = [];
	for (const root of ["modules", "app", "test"]) {
		walkTs(join(REPO_ROOT, root), (n) => /\.integration\.test\.tsx?$/.test(n), out);
	}
	out.push(join(REPO_ROOT, "test", "integration", "factories.ts"));
	return out;
}

/**
 * Clés de PREMIER NIVEAU d'un littéral objet. Les spreads (`...x`) sont ignorés :
 * leur contenu n'est pas statiquement connu, et un spread conditionnel
 * (`...(cond && { a })`) est le motif dominant du repo. Ce test ne prétend donc
 * pas à l'exhaustivité — il attrape les clés écrites en clair, ce qui est
 * exactement la forme du défaut visé.
 */
function literalKeys(node: ts.ObjectLiteralExpression): string[] {
	const keys: string[] = [];
	for (const prop of node.properties) {
		// Hors `SpreadAssignment`, tout membre d'un littéral objet porte un `name`.
		if (ts.isSpreadAssignment(prop)) continue;
		const name = prop.name;
		if (ts.isIdentifier(name)) keys.push(name.text);
		else if (ts.isStringLiteral(name)) keys.push(name.text);
	}
	return keys;
}

/** Les payloads d'un initialiseur `create:` — objet unique ou tableau. */
function payloadsOf(node: ts.Expression): ts.ObjectLiteralExpression[] {
	if (ts.isArrayLiteralExpression(node)) return node.elements.filter(ts.isObjectLiteralExpression);
	return ts.isObjectLiteralExpression(node) ? [node] : [];
}

/**
 * Enregistre un payload, puis DESCEND dans ses écritures imbriquées.
 *
 * Sans cette descente, le scan ne verrait que le premier niveau — or les cinq
 * colonnes fiscales fantômes d'`OrderItem` vivaient dans `items: { create: [...] }`.
 * Un guard qui s'arrête à la racine aurait laissé passer la moitié du défaut.
 *
 * Seul `create` (et `createMany.data`) est suivi : `connect` et le `where` d'un
 * `connectOrCreate` ne sont pas des payloads d'écriture.
 */
function collectPayloadSites(
	model: string,
	method: string,
	payload: ts.ObjectLiteralExpression,
	file: string,
	sf: ts.SourceFile,
	sites: WriteSite[],
): void {
	sites.push({
		file: relative(REPO_ROOT, file),
		line: sf.getLineAndCharacterOfPosition(payload.getStart(sf)).line + 1,
		model,
		method,
		keys: literalKeys(payload),
	});

	const relations = MODEL_RELATIONS.get(model);
	if (!relations) return;

	for (const prop of payload.properties) {
		if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
		const related = relations.get(prop.name.text);
		if (!related || !ts.isObjectLiteralExpression(prop.initializer)) continue;

		for (const nested of prop.initializer.properties) {
			if (!ts.isPropertyAssignment(nested) || !ts.isIdentifier(nested.name)) continue;

			if (nested.name.text === "create") {
				for (const inner of payloadsOf(nested.initializer)) {
					collectPayloadSites(related, `${method}>create`, inner, file, sf, sites);
				}
			} else if (
				nested.name.text === "createMany" &&
				ts.isObjectLiteralExpression(nested.initializer)
			) {
				for (const many of nested.initializer.properties) {
					if (!ts.isPropertyAssignment(many) || !ts.isIdentifier(many.name)) continue;
					if (many.name.text !== "data") continue;
					for (const inner of payloadsOf(many.initializer)) {
						collectPayloadSites(related, `${method}>createMany`, inner, file, sf, sites);
					}
				}
			}
		}
	}
}

function collectWriteSites(files: string[]): WriteSite[] {
	return files.flatMap((file) => {
		const src = readFileSync(file, "utf-8");
		// Pré-filtre bon marché : la majorité des fichiers ne touchent pas Prisma.
		if (!/\b(prisma|tx)\s*\.\s*\w+\s*\.\s*(create|update|upsert)/.test(src)) return [];
		return collectFromSource(file, src);
	});
}

function collectFromSource(file: string, src: string): WriteSite[] {
	const sites: WriteSite[] = [];
	const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);

	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
			const method = node.expression.name.text;
			const receiver = node.expression.expression;

			if (
				WRITE_METHODS.has(method) &&
				ts.isPropertyAccessExpression(receiver) &&
				ts.isIdentifier(receiver.expression) &&
				PRISMA_ROOTS.has(receiver.expression.text)
			) {
				const model = ACCESSOR_TO_MODEL.get(receiver.name.text);
				const arg = node.arguments[0];
				if (model && arg && ts.isObjectLiteralExpression(arg)) {
					for (const prop of arg.properties) {
						if (!ts.isPropertyAssignment(prop)) continue;
						if (!ts.isIdentifier(prop.name) || prop.name.text !== "data") continue;
						// `createMany` prend `data: [...]` ; on inspecte chaque entrée.
						for (const payload of payloadsOf(prop.initializer)) {
							collectPayloadSites(model, method, payload, file, sf, sites);
						}
					}
				}
			}
		}
		ts.forEachChild(node, visit);
	};

	visit(sf);
	return sites;
}

// ---------------------------------------------------------------------------

describe("écritures Prisma — validité schéma (@regression transactional-writes-schema-validity)", () => {
	describe("oracle A — payloads exportés, soumis au validateur Prisma réel", () => {
		it("REFUND_RECORD_SELECT est valide au regard du schéma Refund", async () => {
			await expect(
				verdictOf(() =>
					prisma.refund.findUnique({
						where: { stripeRefundId: "probe" },
						select: REFUND_RECORD_SELECT,
					}),
				),
			).resolves.toBe("schema-valid");
		});

		// Preuve de l'oracle : la forme EXACTE du P0 doit être détectée. Sans cette
		// assertion, un oracle cassé (`verdictOf` qui renverrait toujours
		// "schema-valid") ferait passer la suite en verrouillant… rien.
		it("détecte bien une clé inexistante (contre-épreuve)", async () => {
			await expect(
				verdictOf(() =>
					prisma.refund.findUnique({
						where: { stripeRefundId: "probe" },
						select: { id: true, currency: true } as never,
					}),
				),
			).resolves.toBe("schema-invalid");
		});
	});

	describe("oracle B — littéraux `data` en ligne vs schema.prisma", () => {
		const sites = collectWriteSites(sourceFiles());

		it("le scan trouve effectivement des sites d'écriture", () => {
			// Filet du filet : si le scan casse (renommage de `tx`, refonte de l'AST),
			// il rendrait 0 site et la suite passerait sans rien vérifier.
			expect(sites.length).toBeGreaterThan(20);
			expect(sites.some((s) => s.model === "Refund")).toBe(true);
		});

		it("aucun `data` n'écrit un champ absent du schéma", () => {
			expect(offendersOf(sites).join("\n")).toBe("");
		});
	});

	describe("oracle B' — fixtures d'intégration vs schema.prisma", () => {
		const sites = collectWriteSites(integrationFixtureFiles());

		it("le scan atteint bien les fixtures d'intégration", () => {
			expect(sites.some((s) => s.model === "Order")).toBe(true);
			expect(sites.some((s) => s.file === "test/integration/factories.ts")).toBe(true);
		});

		it("aucune fixture n'écrit un champ absent du schéma", () => {
			expect(offendersOf(sites).join("\n")).toBe("");
		});

		// Contre-épreuve de la DESCENTE. Elle ne peut pas s'appuyer sur le dépôt :
		// depuis que `createTestOrder` est la SSOT, plus aucune fixture n'écrit un
		// `items: { create: [...] }` littéral — le chemin imbriqué n'aurait donc plus
		// aucun sujet, et une régression du scan passerait inaperçue. On lui en donne
		// un, synthétique, qui reproduit EXACTEMENT la forme du défaut du 2026-08-05.
		it("détecte une colonne fantôme IMBRIQUÉE dans `items: { create: … }`", () => {
			const drifted = `
				await prisma.order.create({
					data: {
						orderNumber: "X",
						discountAmount: 0,
						items: {
							create: [{ skuId: "s", quantity: 1, price: 1, taxRate: 0, taxCategoryCode: "ZB" }],
						},
					},
				});
			`;
			const offenders = offendersOf(collectFromSource("synthetic.ts", drifted));

			expect(offenders.some((o) => o.includes("Order.create écrit « discountAmount »"))).toBe(true);
			// Le cœur : sans la descente, ces deux-là seraient invisibles.
			expect(offenders.some((o) => o.includes("OrderItem.create>create écrit « taxRate »"))).toBe(
				true,
			);
			expect(
				offenders.some((o) => o.includes("OrderItem.create>create écrit « taxCategoryCode »")),
			).toBe(true);
		});

		it("ne signale RIEN sur la forme conforme au schéma courant", () => {
			const clean = `
				await prisma.order.create({
					data: {
						orderNumber: "X",
						subtotal: 1,
						total: 1,
						items: { create: [{ skuId: "s", quantity: 1, price: 1, productTitle: "T" }] },
					},
				});
			`;
			expect(offendersOf(collectFromSource("synthetic.ts", clean))).toEqual([]);
		});
	});
});

function offendersOf(sites: WriteSite[]): string[] {
	return sites.flatMap((site) => {
		const fields = MODEL_FIELDS.get(site.model);
		if (!fields) return [];
		return site.keys
			.filter((key) => !fields.has(key))
			.map((key) => `${site.file}:${site.line} — ${site.model}.${site.method} écrit « ${key} »`);
	});
}
