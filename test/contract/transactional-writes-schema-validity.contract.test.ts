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
 * spreads conditionnels la mettraient en défaut), clés de premier niveau
 * uniquement, confrontées aux champs déclarés dans `schema.prisma`. C'est cet
 * oracle-là qui aurait attrapé les 4 `currency:`.
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
 */
function schemaFields(): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>();
	for (const model of schemaSrc.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
		const fields = new Set<string>();
		for (const raw of model[2]!.split("\n")) {
			const line = raw.replace(/\/\/.*$/, "").trim();
			if (!line || line.startsWith("@@") || line.startsWith("///")) continue;
			const f = line.match(/^(\w+)\s+\w+/);
			if (f) fields.add(f[1]!);
		}
		out.set(model[1]!, fields);
	}
	return out;
}

const MODEL_FIELDS = schemaFields();

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

/** Fichiers source à scanner (hors tests, hors généré, hors node_modules). */
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

function collectWriteSites(): WriteSite[] {
	const sites: WriteSite[] = [];

	for (const file of sourceFiles()) {
		const src = readFileSync(file, "utf-8");
		// Pré-filtre bon marché : la majorité des fichiers ne touchent pas Prisma.
		if (!/\b(prisma|tx)\s*\.\s*\w+\s*\.\s*(create|update|upsert)/.test(src)) continue;

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
							const payloads = ts.isArrayLiteralExpression(prop.initializer)
								? prop.initializer.elements.filter(ts.isObjectLiteralExpression)
								: ts.isObjectLiteralExpression(prop.initializer)
									? [prop.initializer]
									: [];
							for (const payload of payloads) {
								sites.push({
									file: relative(REPO_ROOT, file),
									line: sf.getLineAndCharacterOfPosition(payload.getStart(sf)).line + 1,
									model,
									method,
									keys: literalKeys(payload),
								});
							}
						}
					}
				}
			}
			ts.forEachChild(node, visit);
		};

		visit(sf);
	}

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
		const sites = collectWriteSites();

		it("le scan trouve effectivement des sites d'écriture", () => {
			// Filet du filet : si le scan casse (renommage de `tx`, refonte de l'AST),
			// il rendrait 0 site et la suite passerait sans rien vérifier.
			expect(sites.length).toBeGreaterThan(20);
			expect(sites.some((s) => s.model === "Refund")).toBe(true);
		});

		it("aucun `data` n'écrit un champ absent du schéma", () => {
			const offenders = sites.flatMap((site) => {
				const fields = MODEL_FIELDS.get(site.model);
				if (!fields) return [];
				return site.keys
					.filter((key) => !fields.has(key))
					.map(
						(key) => `${site.file}:${site.line} — ${site.model}.${site.method} écrit « ${key} »`,
					);
			});

			expect(offenders, `Champs inexistants au schéma :\n${offenders.join("\n")}`).toEqual([]);
		});
	});
});
