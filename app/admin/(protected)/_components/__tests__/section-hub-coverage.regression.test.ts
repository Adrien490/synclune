/**
 * @regression admin-section-hub-coverage
 *
 * Les 4 pages « hub » de section (`/admin/ventes`, `/catalogue`, `/marketing`,
 * `/configuration`) répliquent l'arborescence à la main via
 * `SectionNavigation` : titre, description et icône par carte. Cette copie
 * éditoriale a de la valeur (elle explique chaque destination, ce que
 * `navigationData` ne fait pas) — mais rien ne garantissait qu'elle reste alignée
 * sur la vraie navigation.
 *
 * Deux dérives possibles, toutes deux silencieuses :
 *  - une carte de hub pointant vers une route qui n'est plus dans la navigation ;
 *  - un item de navigation ajouté sans carte de hub correspondante — il devient
 *    invisible pour qui passe par les hubs.
 *
 * Ce test est STATIQUE (lecture des sources) : les hubs sont des Server Components
 * qui passent des icônes JSX, coûteux à rendre pour vérifier une liste d'URLs.
 *
 * Toute modification requiert une review explicite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { navigationData } from "../navigation-config";

const ROOT = join(import.meta.dirname, "../../../../..");

const HUB_PAGES = [
	"app/admin/(protected)/ventes/page.tsx",
	"app/admin/(protected)/catalogue/page.tsx",
	"app/admin/(protected)/marketing/page.tsx",
	"app/admin/(protected)/configuration/page.tsx",
] as const;

/** Extrait les `href: "/admin/…"` littéraux d'une page de hub. */
function hubHrefs(relPath: string): string[] {
	const code = readFileSync(join(ROOT, relPath), "utf8");
	return [...code.matchAll(/href:\s*"(\/admin\/[^"]+)"/g)].map((m) => m[1] as string);
}

const ALL_HUB_HREFS = HUB_PAGES.flatMap(hubHrefs);

const NAV_URLS = navigationData.navGroups.flatMap((group) => group.items.map((item) => item.url));

/**
 * URLs qui relèvent d'une SECTION, donc d'un hub : `/admin/<section>/<page>`.
 *
 * Les routes de premier niveau (`/admin` le tableau de bord, `/admin/clients` la
 * liste clients) ne vivent sous aucune section et n'ont donc pas de carte de hub —
 * elles ne sont atteignables que par la navigation, ce qui est correct.
 */
const SECTIONED_NAV_URLS = NAV_URLS.filter((url) => url.split("/").filter(Boolean).length >= 3);

describe("@regression admin-section-hub-coverage", () => {
	it("chaque hub expose au moins une carte", () => {
		const empty = HUB_PAGES.filter((page) => hubHrefs(page).length === 0);
		expect(empty).toEqual([]);
	});

	it("aucune carte de hub ne pointe vers une route absente de la navigation", () => {
		const orphans = ALL_HUB_HREFS.filter((href) => !NAV_URLS.includes(href));
		expect(orphans).toEqual([]);
	});

	it("chaque item de navigation d'une section est atteignable depuis son hub", () => {
		const uncovered = SECTIONED_NAV_URLS.filter((url) => !ALL_HUB_HREFS.includes(url));
		expect(uncovered).toEqual([]);
	});

	it("aucune route n'est dupliquée entre deux hubs", () => {
		const seen = new Map<string, number>();
		for (const href of ALL_HUB_HREFS) seen.set(href, (seen.get(href) ?? 0) + 1);
		const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([href]) => href);
		expect(duplicated).toEqual([]);
	});

	/**
	 * L'e-reporting DGFiP a été retiré du code le 2026-07-26 (spec non figée, aucune
	 * Plateforme Agréée branchée). La copie du hub Ventes l'annonçait encore.
	 */
	it("aucune copie de hub ne promet l'e-reporting DGFiP retiré", () => {
		for (const page of HUB_PAGES) {
			const code = readFileSync(join(ROOT, page), "utf8");
			const withoutComments = code.replace(/\/\/.*$/gm, "");
			expect(withoutComments).not.toMatch(/e-reporting/i);
		}
	});
});
