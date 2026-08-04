/**
 * @regression stripe-api-version-ssot
 *
 * La version d'API Stripe ne doit exister qu'à UN endroit :
 * `shared/constants/stripe-api-version.ts`.
 *
 * Elle vivait en quatre exemplaires — `shared/lib/stripe.ts` (×2 + un commentaire)
 * et `app/api/health/route.ts`, qui se reconstruit un client à part pour ses
 * `maxNetworkRetries: 0` / `timeout: 5000`. Un seul test en couvrait une seule
 * (`shared/lib/__tests__/stripe.test.ts`, sur un littéral figé qui plus est) : la
 * copie du healthcheck pouvait dériver indéfiniment, et `docs/stripe/INDEX.md`
 * signalait déjà le risque sans qu'aucun garde-fou ne l'attrape.
 *
 * Épingler la version est le **premier** point de la checklist de mise en
 * production de Stripe ; l'épingler à deux valeurs différentes selon le chemin de
 * code est pire que ne pas l'épingler, parce que le healthcheck rend alors vert
 * une connectivité qui n'est pas celle du tunnel de paiement.
 *
 * Ce test scanne aussi les fixtures : elles portent un `api_version` que le
 * contract test compare à la SSOT (cf. `test/contract/stripe-events.test.ts`).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { STRIPE_API_VERSION } from "../stripe-api-version";

const REPO_ROOT = join(__dirname, "..", "..", "..");

/** `2026-06-24.dahlia`, `2025-09-30.clover`… */
const API_VERSION_LITERAL = /\b\d{4}-\d{2}-\d{2}\.[a-z]+\b/g;

/**
 * Seuls fichiers autorisés à contenir le littéral :
 *  · la SSOT elle-même ;
 *  · ce test (il décrit le motif) ;
 *  · les fixtures Stripe, dont le champ `api_version` EST une donnée — leur
 *    cohérence avec la SSOT est assertée plus bas.
 */
const ALLOWLIST = new Set([
	"shared/constants/stripe-api-version.ts",
	"shared/constants/__tests__/stripe-api-version-ssot.regression.test.ts",
]);

const SCAN_ROOTS = ["app", "modules", "shared"];
const SKIP_DIRS = new Set(["node_modules", "generated", ".next"]);

function scanFiles(): string[] {
	const out: string[] = [];
	const walk = (dir: string): void => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (SKIP_DIRS.has(entry.name)) continue;
				walk(full);
			} else if (/\.tsx?$/.test(entry.name)) {
				out.push(full);
			}
		}
	};
	for (const root of SCAN_ROOTS) walk(join(REPO_ROOT, root));
	return out;
}

describe("version d'API Stripe — SSOT (@regression stripe-api-version-ssot)", () => {
	it("n'apparaît en littéral nulle part hors de la SSOT", () => {
		const offenders: string[] = [];

		for (const file of scanFiles()) {
			const rel = relative(REPO_ROOT, file);
			if (ALLOWLIST.has(rel)) continue;

			const matches = readFileSync(file, "utf-8").match(API_VERSION_LITERAL);
			if (matches) offenders.push(`${rel} — ${[...new Set(matches)].join(", ")}`);
		}

		expect(
			offenders,
			`Version d'API en dur (importer STRIPE_API_VERSION à la place) :\n${offenders.join("\n")}`,
		).toEqual([]);
	});

	it("les fixtures webhook déclarent la version épinglée", () => {
		const dir = join(REPO_ROOT, "test", "fixtures", "stripe");
		const fixtures = readdirSync(dir).filter((f) => f.endsWith(".json"));

		// Filet du filet : un glob cassé rendrait 0 fixture et la boucle passerait.
		expect(fixtures.length).toBeGreaterThan(0);

		for (const name of fixtures) {
			const parsed = JSON.parse(readFileSync(join(dir, name), "utf-8")) as {
				api_version?: string;
			};
			expect(parsed.api_version, `${name} déclare une version d'API obsolète`).toBe(
				STRIPE_API_VERSION,
			);
		}
	});
});
