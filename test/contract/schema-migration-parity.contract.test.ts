/**
 * @regression schema-migration-parity — schema.prisma ↔ baseline 0_init ↔ gardes bruts
 *
 * ============================================================================
 * CE QUE CE TEST GARANTIT
 * ============================================================================
 *
 * Depuis le baseline (audit schéma 2026-07-26), `prisma/migrations/` contient une
 * seule migration `0_init` qui reconstruit toute la base. Trois artefacts doivent
 * donc rester d'accord, et rien dans Prisma ne le vérifie :
 *
 *   1. `prisma/schema.prisma`              — ce que le code croit
 *   2. `prisma/migrations/0_init/…`        — ce que `migrate deploy` construit
 *   3. `prisma/sql/raw-guards.sql`         — les CHECK / triggers / index que
 *                                            Prisma ne génère jamais
 *
 * Historique du problème : avant le baseline, l'historique incrémental n'était pas
 * rejouable (21 tables `ALTER`ées sans `CREATE`) et `Order.reviewRequestSentAt` a
 * survécu ~2,5 mois déclarée au schéma alors qu'une migration l'avait droppée.
 * Le drift était invisible parce que le setup d'intégration applique `db push`
 * (donc recrée tout depuis schema.prisma) au lieu de rejouer les migrations.
 *
 * Les gardes bruts sont le point sensible : `prisma migrate diff` en produit ZÉRO.
 * Un baseline régénéré sans son annexe perdrait silencieusement le format de
 * numéro de facture (Art. 286 CGI), le trigger d'unicité cross-table des avoirs,
 * le CHECK singleton de StoreSettings, la formule de total de commande…
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");
const MIGRATIONS_DIR = join(REPO_ROOT, "prisma", "migrations");
const BASELINE = join(MIGRATIONS_DIR, "0_init", "migration.sql");
const RAW_GUARDS = join(REPO_ROOT, "prisma", "sql", "raw-guards.sql");

const schemaSrc = readFileSync(join(REPO_ROOT, "prisma", "schema.prisma"), "utf-8");
const baselineSrc = readFileSync(BASELINE, "utf-8");
const guardsSrc = readFileSync(RAW_GUARDS, "utf-8");

/**
 * Divergences assumées entre le schéma et le baseline. Clé `Table.colonne`,
 * valeur = justification obligatoire. Le réflexe par défaut face à un échec est
 * de régénérer le baseline, PAS d'allonger cette liste.
 */
const KNOWN_DIVERGENCES = new Map<string, string>([
	// (vide — toute entrée future doit porter sa justification)
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retire les commentaires SQL. Les migrations du repo en sont pleines, et
 *  plusieurs citent du DDL en prose (`-- DROP COLUMN "x"`) : sans ce nettoyage,
 *  un commentaire serait lu comme une instruction. */
function stripSqlComments(sql: string): string {
	return sql
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.split("\n")
		.map((l) => l.replace(/--.*$/, ""))
		.join("\n");
}

/** Découpe en instructions, en respectant les blocs dollar-quoted ($$ … $$)
 *  qui contiennent des `;` internes (corps des fonctions plpgsql). */
function splitStatements(sql: string): string[] {
	const out: string[] = [];
	let buf = "";
	let inDollar = false;
	for (let i = 0; i < sql.length; i++) {
		if (sql.startsWith("$$", i)) {
			inDollar = !inDollar;
			buf += "$$";
			i++;
			continue;
		}
		const ch = sql[i]!;
		if (ch === ";" && !inDollar) {
			if (buf.trim()) out.push(buf.replace(/\s+/g, " ").trim());
			buf = "";
		} else buf += ch;
	}
	if (buf.trim()) out.push(buf.replace(/\s+/g, " ").trim());
	return out;
}

function splitTopLevel(input: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let cur = "";
	for (const ch of input) {
		if (ch === "(") depth++;
		else if (ch === ")") depth--;
		if (ch === "," && depth === 0) {
			out.push(cur);
			cur = "";
			continue;
		}
		cur += ch;
	}
	out.push(cur);
	return out.map((s) => s.trim()).filter(Boolean);
}

/** `Table -> colonnes` déclarées dans schema.prisma (hors champs de relation). */
function schemaColumns(): Map<string, Set<string>> {
	const models = new Set(Array.from(schemaSrc.matchAll(/^model\s+(\w+)\s*\{/gm), (m) => m[1]!));
	const enums = new Set(Array.from(schemaSrc.matchAll(/^enum\s+(\w+)\s*\{/gm), (m) => m[1]!));
	const out = new Map<string, Set<string>>();

	for (const model of schemaSrc.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
		const cols = new Set<string>();
		for (const raw of model[2]!.split("\n")) {
			const line = raw.replace(/\/\/.*$/, "").trim();
			if (!line || line.startsWith("@@") || line.startsWith("///")) continue;
			const f = line.match(/^(\w+)\s+(\w+)(\[\])?/);
			if (!f) continue;
			const [, name, type, isList] = f;
			if (models.has(type!)) continue; // relation → pas de colonne
			if (isList && !enums.has(type!)) continue;
			cols.add(name!);
		}
		out.set(model[1]!, cols);
	}
	return out;
}

/** `Table -> colonnes` telles que 0_init les construit. */
function baselineColumns(): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>();
	for (const stmt of splitStatements(stripSqlComments(baselineSrc))) {
		const create = stmt.match(
			/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s*\(([\s\S]*)\)$/i,
		);
		if (create) {
			const cols = new Set<string>();
			for (const part of splitTopLevel(create[2]!)) {
				if (/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|EXCLUDE)\b/i.test(part))
					continue;
				const c = part.match(/^"?(\w+)"?\s+/);
				if (c) cols.add(c[1]!);
			}
			out.set(create[1]!, cols);
			continue;
		}
		const alter = stmt.match(/^ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?\s+([\s\S]*)$/i);
		if (!alter) continue;
		const cols = out.get(alter[1]!);
		if (!cols) continue;
		for (const clause of splitTopLevel(alter[2]!)) {
			const add = clause.match(/^ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/i);
			if (add) cols.add(add[1]!);
			const drop = clause.match(/^DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?/i);
			if (drop) cols.delete(drop[1]!);
		}
	}
	return out;
}

/** Noms de tous les gardes bruts déclarés dans raw-guards.sql. */
function guardNames(src: string): {
	checks: Set<string>;
	indexes: Set<string>;
	triggers: Set<string>;
} {
	const grab = (re: RegExp) => new Set(Array.from(src.matchAll(re), (m) => m[m.length - 1]!));
	return {
		checks: grab(/ADD\s+CONSTRAINT\s+"([A-Za-z_0-9]+)"\s+CHECK/g),
		indexes: grab(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"([A-Za-z_0-9]+)"/g),
		triggers: grab(/CREATE\s+TRIGGER\s+"([A-Za-z_0-9]+)"/g),
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("schema.prisma ↔ baseline 0_init", () => {
	const fromSchema = schemaColumns();
	const fromBaseline = baselineColumns();

	it("l'historique est bien baseliné (une seule migration, 0_init)", () => {
		const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
			.filter((e) => e.isDirectory())
			.map((e) => e.name);
		expect(dirs).toEqual(["0_init"]);
		expect(existsSync(join(MIGRATIONS_DIR, "0_init", "down.sql"))).toBe(true);
	});

	// Sanity du parser : sans ça les comparaisons passeraient à vide.
	it("le parser reconstruit un état non trivial des deux côtés", () => {
		expect(fromSchema.size).toBeGreaterThanOrEqual(30);
		expect(fromBaseline.size).toBe(fromSchema.size);
		expect(fromBaseline.get("Order")?.has("invoiceNumber")).toBe(true);
	});

	it("toute colonne du schéma est construite par le baseline", () => {
		const missing: string[] = [];
		for (const [table, cols] of fromSchema) {
			const built = fromBaseline.get(table);
			if (!built) {
				missing.push(`${table}.* — table jamais créée par 0_init`);
				continue;
			}
			for (const col of cols) {
				const key = `${table}.${col}`;
				if (KNOWN_DIVERGENCES.has(key)) continue;
				if (!built.has(col)) missing.push(key);
			}
		}
		expect(
			missing,
			`Ces colonnes sont déclarées dans schema.prisma mais ne sont PAS créées par ` +
				`0_init :\n  ${missing.join("\n  ")}\n\n` +
				`\`prisma migrate deploy\` produirait donc une base incomplète. Régénérer le ` +
				`baseline (cf. en-tête de 0_init/migration.sql), puis vérifier que l'annexe ` +
				`des gardes bruts est toujours présente.`,
		).toEqual([]);
	});

	it("toute colonne construite par le baseline est déclarée au schéma", () => {
		const orphans: string[] = [];
		for (const [table, cols] of fromBaseline) {
			const declared = fromSchema.get(table);
			if (!declared) {
				orphans.push(`${table}.* — table créée par 0_init, absente de schema.prisma`);
				continue;
			}
			for (const col of cols) {
				const key = `${table}.${col}`;
				if (KNOWN_DIVERGENCES.has(key)) continue;
				if (!declared.has(col)) orphans.push(key);
			}
		}
		expect(
			orphans,
			`Ces colonnes seraient créées en base par 0_init sans exister dans ` +
				`schema.prisma :\n  ${orphans.join("\n  ")}\n\n` +
				`Prisma ne les supprimera jamais tout seul, et si elles portent de la PII ` +
				`elles échappent aussi aux contrats de purge RGPD.`,
		).toEqual([]);
	});

	it("whitelist sanity — chaque KNOWN_DIVERGENCES est réellement divergente", () => {
		const unjustified: string[] = [];
		for (const [key, reason] of KNOWN_DIVERGENCES) {
			const [t, c] = key.split(".");
			const inSchema = fromSchema.get(t!)?.has(c!) ?? false;
			const inBaseline = fromBaseline.get(t!)?.has(c!) ?? false;
			if (inSchema === inBaseline) {
				unjustified.push(`${key} whitelistée (« ${reason} ») mais plus divergente — retirer.`);
			}
			if (reason.trim().length < 10) unjustified.push(`${key} : justification manquante.`);
		}
		expect(unjustified, unjustified.join("\n")).toEqual([]);
	});
});

describe("gardes SQL bruts — SSOT ↔ baseline ↔ documentation", () => {
	const ssot = guardNames(guardsSrc);
	const inBaseline = guardNames(baselineSrc);

	it("la SSOT contient bien les gardes attendus (sanity)", () => {
		// Repères stables : si ces trois-là disparaissent, l'extraction est cassée
		// et les assertions suivantes passeraient à vide.
		expect(ssot.checks.has("Order_invoiceNumber_format")).toBe(true); // Art. 286 CGI
		expect(ssot.checks.has("Order_total_formula")).toBe(true); // invariant monétaire
		expect(ssot.triggers.has("Order_creditNoteNumber_cross_unique")).toBe(true);
		expect(ssot.checks.size).toBeGreaterThanOrEqual(50);
	});

	// LE point critique : `prisma migrate diff` ne génère AUCUN garde brut. Un
	// baseline régénéré sans recoller l'annexe perdrait tout, en silence.
	it("le baseline embarque l'intégralité des gardes de la SSOT", () => {
		const missing = [
			...[...ssot.checks].filter((n) => !inBaseline.checks.has(n)).map((n) => `CHECK ${n}`),
			...[...ssot.indexes].filter((n) => !inBaseline.indexes.has(n)).map((n) => `INDEX ${n}`),
			...[...ssot.triggers].filter((n) => !inBaseline.triggers.has(n)).map((n) => `TRIGGER ${n}`),
		];
		expect(
			missing,
			`Ces gardes existent dans prisma/sql/raw-guards.sql mais MANQUENT dans ` +
				`l'annexe de 0_init :\n  ${missing.join("\n  ")}\n\n` +
				`\`prisma migrate deploy\` construirait une base sans eux — dont, selon les ` +
				`cas, le format de numéro de facture (Art. 286 CGI) ou le trigger ` +
				`d'unicité cross-table des avoirs. Recoller raw-guards.sql en partie 2 ` +
				`de 0_init/migration.sql.`,
		).toEqual([]);
	});

	it("chaque garde est nommé dans un commentaire de schema.prisma", () => {
		const all = [...ssot.checks, ...ssot.indexes, ...ssot.triggers];
		const undocumented = all.filter((n) => !schemaSrc.includes(n));
		expect(
			undocumented,
			`Ces gardes DB ne sont mentionnés nulle part dans schema.prisma :\n  ` +
				`${undocumented.join("\n  ")}\n\n` +
				`Un développeur qui lit le modèle ne peut pas les deviner — et une ` +
				`contrainte invisible se fait supprimer par accident. Les documenter dans ` +
				`le bloc de commentaires du modèle concerné.`,
		).toEqual([]);
	});

	it("la SSOT est idempotente : chaque garde est précédé d'un DROP … IF EXISTS", () => {
		const notGuarded: string[] = [];
		for (const n of ssot.checks) {
			if (!new RegExp(`DROP\\s+CONSTRAINT\\s+IF\\s+EXISTS\\s+"${n}"`).test(guardsSrc))
				notGuarded.push(`CHECK ${n}`);
		}
		for (const n of ssot.indexes) {
			if (!new RegExp(`DROP\\s+INDEX\\s+IF\\s+EXISTS\\s+"${n}"`).test(guardsSrc))
				notGuarded.push(`INDEX ${n}`);
		}
		for (const n of ssot.triggers) {
			if (!new RegExp(`DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+"${n}"`).test(guardsSrc))
				notGuarded.push(`TRIGGER ${n}`);
		}
		expect(
			notGuarded,
			`raw-guards.sql doit pouvoir être rejoué sur une base déjà à jour (le setup ` +
				`d'intégration l'applique après chaque \`db push\`). Ces gardes ne sont pas ` +
				`précédés d'un DROP … IF EXISTS :\n  ${notGuarded.join("\n  ")}`,
		).toEqual([]);
	});

	it("les fonctions et extensions requises précèdent leurs consommateurs", () => {
		const code = stripSqlComments(guardsSrc);
		const posExtension = code.indexOf("CREATE EXTENSION IF NOT EXISTS pg_trgm");
		const posFunction = code.indexOf("CREATE OR REPLACE FUNCTION immutable_unaccent");
		const posFirstGin = code.indexOf("USING gin");
		expect(posExtension).toBeGreaterThanOrEqual(0);
		expect(posFunction).toBeGreaterThan(posExtension);
		// Les index GIN d'expression ne peuvent être créés qu'après la fonction
		// IMMUTABLE et l'extension pg_trgm — sinon le fichier échoue à l'exécution.
		expect(posFirstGin).toBeGreaterThan(posFunction);
	});
});
