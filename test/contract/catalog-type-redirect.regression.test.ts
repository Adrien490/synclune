/**
 * @regression catalog-type-redirect
 *
 * `/produits?type=X` doit se consolider en **308** vers `/produits/X` — l'URL
 * canonique d'une famille (sitemap, méga-menu, `opengraph-image`, canonical).
 *
 * Cette redirection vivait dans `app/(shop)/produits/page.tsx` sous forme de
 * `permanentRedirect`, ce qui imposait un `await searchParams` au niveau
 * supérieur de la page : sous `cacheComponents`, la page devenait entièrement
 * dynamique et son App Shell se réduisait au squelette PLEINE PAGE de
 * `loading.tsx` — affiché à chaque changement de filtre. Elle a été déplacée
 * dans `proxy.ts`, où une normalisation d'URL appartient.
 *
 * Deux propriétés à ne pas perdre dans ce déménagement :
 *
 * 1. **La condition exacte** — `type` doit être le SEUL filtre, en un seul
 *    exemplaire. Avec une couleur ou un prix en plus, la page reste `/produits`
 *    (et son `generateMetadata` la passe en noindex) ; avec deux types, l'URL
 *    multi-facettes est la bonne.
 * 2. **Le garde de slug** — la valeur atterrit désormais dans un CHEMIN
 *    construit ici. `type=../admin` fabriquerait une redirection interne
 *    arbitraire ; l'ancien `permanentRedirect` avait la même exposition, mais
 *    personne ne la testait.
 */

import { describe, expect, it } from "vitest";

import { catalogTypeRedirect } from "@/proxy";

/** `nextUrl` est un `URL` enrichi ; seules `pathname`/`searchParams`/`origin` sont lues. */
function url(href: string) {
	return new URL(href, "https://synclune.fr") as unknown as Parameters<
		typeof catalogTypeRedirect
	>[0];
}

describe("catalogTypeRedirect (@regression catalog-type-redirect)", () => {
	it("consolide un type seul vers la page catégorie", () => {
		expect(catalogTypeRedirect(url("/produits?type=bagues"))?.toString()).toBe(
			"https://synclune.fr/produits/bagues",
		);
	});

	it("reporte recherche, tri et curseur — mais pas perPage", () => {
		const target = catalogTypeRedirect(
			url(
				"/produits?type=bagues&search=rose&sortBy=price-ascending&cursor=abc&direction=forward&perPage=48",
			),
		);

		expect(target?.pathname).toBe("/produits/bagues");
		expect(target?.searchParams.get("search")).toBe("rose");
		expect(target?.searchParams.get("sortBy")).toBe("price-ascending");
		expect(target?.searchParams.get("cursor")).toBe("abc");
		expect(target?.searchParams.get("direction")).toBe("forward");
		// `perPage` était déjà abandonné par la version page — la page catégorie
		// retombe sur son défaut. Comportement conservé à l'identique.
		expect(target?.searchParams.has("perPage")).toBe(false);
	});

	it("ne redirige pas quand un AUTRE filtre est actif", () => {
		for (const href of [
			"/produits?type=bagues&color=rose",
			"/produits?type=bagues&material=resine",
			"/produits?type=bagues&priceMin=20&priceMax=80",
			"/produits?type=bagues&stockStatus=in_stock",
			"/produits?type=bagues&onSale=true",
		]) {
			expect(catalogTypeRedirect(url(href)), href).toBeNull();
		}
	});

	it("ne redirige pas sur multi-types (l'URL à facettes est la bonne)", () => {
		expect(catalogTypeRedirect(url("/produits?type=bagues&type=colliers"))).toBeNull();
	});

	it("ne redirige pas sans type", () => {
		expect(catalogTypeRedirect(url("/produits"))).toBeNull();
		expect(catalogTypeRedirect(url("/produits?sortBy=price-ascending"))).toBeNull();
	});

	it("ne s'applique qu'à /produits nue", () => {
		expect(catalogTypeRedirect(url("/produits/bagues?type=colliers"))).toBeNull();
		expect(catalogTypeRedirect(url("/collections?type=bagues"))).toBeNull();
	});

	it("refuse tout slug hors [a-z0-9-] plutôt que de le mettre dans un chemin", () => {
		for (const raw of ["../admin", "..%2Fadmin", "a/b", "Bagues", "bague s", ""]) {
			const target = catalogTypeRedirect(url(`/produits?type=${encodeURIComponent(raw)}`));
			expect(target, raw).toBeNull();
		}
	});
});
