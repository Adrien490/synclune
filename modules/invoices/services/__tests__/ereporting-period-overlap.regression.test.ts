import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression ereporting-period-no-overlap-2026-05-29
 *
 * Verrouille la garantie de NON-RECOUVREMENT des périodes e-reporting
 * (EINV-EREPORT-006). `EReportingBatch.periodFrom/periodTo` étaient des DateTime
 * libres : rien n'empêchait deux batches de couvrir des périodes qui se chevauchent
 * (double déclaration DGFiP).
 *
 * ⚠️ L'exclusion constraint ne porte QUE le non-recouvrement, PAS l'absence de trou
 * (sauter une période contiguë la satisfait). L'anti-trou est porté hors schéma par
 * `build-ereporting-batch` + le contrôle de continuité
 * `check-ereporting-period-continuity.service.ts` (testé séparément,
 * @regression ereporting-orphan-continuity).
 *
 * Le non-recouvrement est porté par le modèle `EReportingPeriod` via une exclusion
 * constraint Postgres `EReportingPeriod_no_overlap`
 * (EXCLUDE USING gist (tsrange(periodFrom, periodTo, '[)') WITH &&)). Ce test
 * verrouille :
 *  1. la présence du modèle + de sa relation avec EReportingBatch dans le schéma ;
 *  2. la présence de la contrainte d'exclusion (et du CHECK d'ordre des bornes)
 *     dans la migration SQL — non exprimable en Prisma.
 *
 * Le comportement DB réel (rejet d'un overlap, acceptation de bornes contiguës) est
 * vérifié contre un vrai Postgres dans `ereporting-period-overlap.integration.test.ts`.
 */
describe("EReporting periods — non-recouvrement (EINV-EREPORT-006)", () => {
	const REPO_ROOT = process.cwd();
	const schema = readFileSync(join(REPO_ROOT, "prisma", "schema.prisma"), "utf-8");
	const migration = readFileSync(
		join(
			REPO_ROOT,
			"prisma",
			"migrations",
			"20260529130000_add_ereporting_period_exclusion",
			"migration.sql",
		),
		"utf-8",
	);
	const down = readFileSync(
		join(
			REPO_ROOT,
			"prisma",
			"migrations",
			"20260529130000_add_ereporting_period_exclusion",
			"down.sql",
		),
		"utf-8",
	);

	function extractModel(name: string): string {
		const match = schema.match(new RegExp(`model\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
		if (!match) throw new Error(`Model ${name} not found`);
		return match[1]!;
	}

	describe("schema.prisma", () => {
		it("declares EReportingPeriod with periodFrom/periodTo + batches back-relation", () => {
			const period = extractModel("EReportingPeriod");
			expect(period).toMatch(/^\s*periodFrom\s+DateTime\s+@unique/m);
			expect(period).toMatch(/^\s*periodTo\s+DateTime/m);
			expect(period).toMatch(/^\s*batches\s+EReportingBatch\[\]/m);
		});

		it("EReportingBatch references a period (SetNull) and keeps its period index", () => {
			const batch = extractModel("EReportingBatch");
			expect(batch).toMatch(/period\s+EReportingPeriod\?[\s\S]*?onDelete:\s*SetNull/);
			expect(batch).toMatch(/^\s*periodId\s+String\?/m);
			expect(batch).toMatch(/@@index\(\[periodId\]\)/);
		});
	});

	describe("migration.sql", () => {
		it("adds the exclusion constraint on a tsrange (NOT tstzrange) with '[)' bounds", () => {
			// tsrange car periodFrom/To sont des timestamp(3) SANS time zone.
			expect(migration).toMatch(/EReportingPeriod_no_overlap/);
			expect(migration).toMatch(
				/EXCLUDE\s+USING\s+gist\s*\(\s*tsrange\(\s*"periodFrom"\s*,\s*"periodTo"\s*,\s*'\[\)'\s*\)\s+WITH\s+&&\s*\)/i,
			);
			// Garde-fou : ne doit PAS utiliser un tstzrange(...) (hypothèse timezone de
			// session sur une colonne tz-naïve). On cible l'appel de fonction, pas la
			// prose des commentaires qui mentionne le mot.
			expect(migration).not.toMatch(/tstzrange\s*\(/i);
		});

		it("adds a CHECK guaranteeing periodFrom < periodTo (intervalle non vide)", () => {
			expect(migration).toMatch(/EReportingPeriod_period_order/);
			expect(migration).toMatch(/CHECK\s*\(\s*"periodFrom"\s*<\s*"periodTo"\s*\)/i);
		});

		it("does NOT create a Postgres extension (btree_gist inutile pour tsrange &&)", () => {
			expect(migration).not.toMatch(/CREATE\s+EXTENSION/i);
		});
	});

	describe("down.sql", () => {
		it("drops the exclusion constraint and the period table", () => {
			expect(down).toMatch(/DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+"EReportingPeriod_no_overlap"/i);
			expect(down).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+"EReportingPeriod"/i);
		});
	});
});
