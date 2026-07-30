/**
 * @regression schema-migration-parity — schema.prisma ↔ migrations ↔ gardes bruts
 *
 * ============================================================================
 * CE QUE CE TEST GARANTIT
 * ============================================================================
 *
 * Trois artefacts doivent rester d'accord, et rien dans Prisma ne le vérifie :
 *
 *   1. `prisma/schema.prisma`              — ce que le code croit
 *   2. `prisma/migrations/*​/migration.sql` — ce que `migrate deploy` construit
 *   3. `prisma/sql/raw-guards.sql`         — les CHECK / triggers / index que
 *                                            Prisma ne génère jamais
 *
 * Historique du problème : avant le baseline (audit schéma 2026-07-26), l'historique
 * incrémental n'était pas rejouable (21 tables `ALTER`ées sans `CREATE`) et
 * `Order.reviewRequestSentAt` a survécu ~2,5 mois déclarée au schéma alors qu'une
 * migration l'avait droppée. Le drift était invisible parce que le setup
 * d'intégration applique `db push` (donc recrée tout depuis schema.prisma) au lieu
 * de rejouer les migrations.
 *
 * Les gardes bruts sont le point sensible : `prisma migrate diff` en produit ZÉRO.
 * Un baseline régénéré sans son annexe perdrait silencieusement le format de
 * numéro de facture (Art. 286 CGI), le trigger d'unicité cross-table des avoirs,
 * le CHECK singleton de StoreSettings, la formule de total de commande…
 *
 * ⚠️ CE TEST LIT **TOUTES** LES MIGRATIONS, PAS SEULEMENT LE BASELINE (audit
 * schéma 2026-07-30). Sa première version assertait `dirs === ["0_init"]` et
 * reconstruisait l'état DB depuis `0_init` seul : la première migration écrite
 * après le baseline le faisait donc rougir, et il ne restait que deux issues —
 * éditer `0_init` (son checksum change ⇒ `migrate deploy` refuse « migration was
 * modified after it was applied » sur toute base où il est marqué appliqué), ou
 * supprimer les assertions. Un garde-fou qui interdit l'évolution légitime se
 * fait désinstaller ; celui-ci replie maintenant les migrations dans l'ordre
 * lexicographique (CREATE/ADD puis DROP), donc un garde ou une colonne
 * introduits par une migration POSTÉRIEURE au baseline sont acceptés.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");
const MIGRATIONS_DIR = join(REPO_ROOT, "prisma", "migrations");
const RAW_GUARDS = join(REPO_ROOT, "prisma", "sql", "raw-guards.sql");

const schemaSrc = readFileSync(join(REPO_ROOT, "prisma", "schema.prisma"), "utf-8");
const guardsSrc = readFileSync(RAW_GUARDS, "utf-8");

/** Dossiers de migration, triés — c'est l'ordre dans lequel `migrate deploy` applique. */
function migrationDirs(): string[] {
	return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name)
		.sort();
}

/**
 * Concaténation de toutes les `migration.sql` dans l'ordre d'application : l'état
 * que `prisma migrate deploy` construit sur une base vide. Le fold de `ALTER TABLE
 * ADD/DROP COLUMN` et de `DROP … / CREATE …` en dépend, donc l'ordre est structurant.
 */
const migrationsSrc = migrationDirs()
	.map((d) => readFileSync(join(MIGRATIONS_DIR, d, "migration.sql"), "utf-8"))
	.join("\n\n");

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

/** `Table -> colonnes` telles que l'ensemble des migrations les construit. */
function migratedColumns(): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>();
	for (const stmt of splitStatements(stripSqlComments(migrationsSrc))) {
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
		// `DROP TABLE` retire la table entière de l'état reconstruit. Sans ce cas, une
		// table créée par le baseline puis droppée par une migration postérieure
		// resterait comptée comme « construite par les migrations » et serait signalée
		// orpheline face à schema.prisma — le fold n'était complet que pour les
		// COLONNES (audit : retrait du système d'avis, 2026-07-30).
		const dropTable = stmt.match(/^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?/i);
		if (dropTable) {
			out.delete(dropTable[1]!);
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

/**
 * État FINAL des gardes bruts après application séquentielle de `src` : un `DROP`
 * retire, un `CREATE`/`ADD CONSTRAINT` remet. Le fold (et non un simple `matchAll`
 * des CREATE) est ce qui rend le test juste quand une migration postérieure
 * remplace un garde du baseline — ou le retire pour de bon.
 *
 * Sur `raw-guards.sql`, dont chaque garde est un `DROP … IF EXISTS` suivi de son
 * `CREATE`, le fold rend exactement le même ensemble qu'une lecture naïve.
 */
function guardNames(src: string): {
	checks: Set<string>;
	indexes: Set<string>;
	triggers: Set<string>;
} {
	const checks = new Set<string>();
	const indexes = new Set<string>();
	const triggers = new Set<string>();

	for (const stmt of splitStatements(stripSqlComments(src))) {
		const addCheck = stmt.match(/ADD\s+CONSTRAINT\s+"([A-Za-z_0-9]+)"\s+CHECK/i);
		if (addCheck) checks.add(addCheck[1]!);
		const dropCheck = stmt.match(/DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?"([A-Za-z_0-9]+)"/i);
		if (dropCheck) checks.delete(dropCheck[1]!);

		const createIdx = stmt.match(
			/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"([A-Za-z_0-9]+)"/i,
		);
		if (createIdx) indexes.add(createIdx[1]!);
		const dropIdx = stmt.match(/DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?"([A-Za-z_0-9]+)"/i);
		if (dropIdx) indexes.delete(dropIdx[1]!);

		const createTrg = stmt.match(/CREATE\s+TRIGGER\s+"([A-Za-z_0-9]+)"/i);
		if (createTrg) triggers.add(createTrg[1]!);
		const dropTrg = stmt.match(/DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?"([A-Za-z_0-9]+)"/i);
		if (dropTrg) triggers.delete(dropTrg[1]!);
	}

	return { checks, indexes, triggers };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("schema.prisma ↔ migrations", () => {
	const fromSchema = schemaColumns();
	const fromBaseline = migratedColumns();

	it("l'historique part du baseline et chaque migration porte son down.sql", () => {
		const dirs = migrationDirs();
		// `0_init` reconstruit toute la base : il doit rester la PREMIÈRE migration.
		// Les suivantes sont incrémentales et libres — exiger `dirs === ["0_init"]`
		// interdisait d'en écrire une (cf. en-tête).
		expect(dirs[0]).toBe("0_init");
		const missingDown = dirs.filter((d) => !existsSync(join(MIGRATIONS_DIR, d, "down.sql")));
		expect(
			missingDown,
			`Règle CLAUDE.md : toute migration doit fournir un down.sql pour permettre ` +
				`un rollback rapide en incident production. Manquants :\n  ${missingDown.join("\n  ")}`,
		).toEqual([]);
	});

	// Sanity du parser : sans ça les comparaisons passeraient à vide.
	it("le parser reconstruit un état non trivial des deux côtés", () => {
		expect(fromSchema.size).toBeGreaterThanOrEqual(30);
		expect(fromBaseline.size).toBe(fromSchema.size);
		expect(fromBaseline.get("Order")?.has("invoiceNumber")).toBe(true);
	});

	// Garde-fou du garde-fou : prouve que la branche `DROP TABLE` du fold est bien
	// exercée. `ProductReview` est CREATE par 0_init puis DROP par
	// 20260730120000_drop_reviews_system — si la regex de drop cessait de matcher,
	// la table réapparaîtrait ici (et l'assertion de taille ci-dessus rougirait
	// aussi, mais sans dire pourquoi).
	it("une table droppée par une migration postérieure sort de l'état reconstruit", () => {
		expect(migrationsSrc).toContain('CREATE TABLE "ProductReview"');
		expect(migrationsSrc).toContain('DROP TABLE IF EXISTS "ProductReview"');
		expect(fromBaseline.has("ProductReview")).toBe(false);
		expect(fromSchema.has("ProductReview")).toBe(false);
	});

	it("toute colonne du schéma est construite par les migrations", () => {
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
			`Ces colonnes sont déclarées dans schema.prisma mais ne sont créées par AUCUNE ` +
				`migration :\n  ${missing.join("\n  ")}\n\n` +
				`\`prisma migrate deploy\` produirait donc une base incomplète. Écrire une ` +
				`migration incrémentale (+ son down.sql) — ne PAS éditer 0_init, dont le ` +
				`checksum est enregistré dans \`_prisma_migrations\` sur les bases où il est ` +
				`marqué appliqué.`,
		).toEqual([]);
	});

	it("toute colonne construite par les migrations est déclarée au schéma", () => {
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
			`Ces colonnes seraient créées en base par les migrations sans exister dans ` +
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

describe("gardes SQL bruts — SSOT ↔ migrations ↔ documentation", () => {
	const ssot = guardNames(guardsSrc);
	const inBaseline = guardNames(migrationsSrc);

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
	it("les migrations embarquent l'intégralité des gardes de la SSOT", () => {
		const missing = [
			...[...ssot.checks].filter((n) => !inBaseline.checks.has(n)).map((n) => `CHECK ${n}`),
			...[...ssot.indexes].filter((n) => !inBaseline.indexes.has(n)).map((n) => `INDEX ${n}`),
			...[...ssot.triggers].filter((n) => !inBaseline.triggers.has(n)).map((n) => `TRIGGER ${n}`),
		];
		expect(
			missing,
			`Ces gardes existent dans prisma/sql/raw-guards.sql mais MANQUENT de toutes ` +
				`les migrations :\n  ${missing.join("\n  ")}\n\n` +
				`\`prisma migrate deploy\` construirait une base sans eux — dont, selon les ` +
				`cas, le format de numéro de facture (Art. 286 CGI) ou le trigger ` +
				`d'unicité cross-table des avoirs. Un garde ajouté à la SSOT doit venir avec ` +
				`sa migration incrémentale (les bases existantes ne rejouent pas la SSOT).`,
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
