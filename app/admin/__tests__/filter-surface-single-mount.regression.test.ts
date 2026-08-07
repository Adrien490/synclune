/**
 * @regression admin-filter-surface-single-mount
 *
 * Audit d'imbrication de composants, 2026-08-07.
 *
 * Les **huit** pages liste admin montaient leur feuille de filtres DEUX fois : une
 * fois dans leur `*-bottom-bar.tsx` (contrôlée, `hideTrigger`, ouverte par la barre
 * basse) et une fois dans leur `Toolbar` desktop — uniquement pour obtenir le
 * déclencheur intégré de `FilterSheetWrapper`.
 *
 * Ce second montage n'apportait aucune bascule : les `*FilterSheet` passent tous par
 * `FilterSheetWrapper`, qui choisit déjà bottom-sheet ↔ right-sheet selon le viewport
 * (`useIsMobile() || isTabletPortrait`). Il coûtait en revanche cher —
 * `products-filter-sheet.tsx` crée cinq hooks d'état dans son corps, donc la page
 * portait **deux brouillons de filtres indépendants**, dont un seul atteignable, et
 * ~2 400 lignes de composants s'instanciaient en double sur les huit listes.
 *
 * Le correctif : la barre basse garde le montage UNIQUE, et la toolbar desktop rend un
 * `<FilterTriggerButton />` qui pousse l'ouverture dans le `SheetStore` PARTAGÉ via
 * `useToolbarDrawer` — le canal que la barre basse utilisait déjà (cf. la JSDoc de
 * `use-toolbar-drawer.ts`, écrite pour un bug voisin : un état local rendait le badge
 * de tri inerte).
 *
 * ⚠️ Ce test est statique et compte les montages JSX. Le défaut qu'il attrape est
 * invisible autrement : les deux instances rendent correctement, aucune n'erre, et
 * seule celle que le déclencheur atteint est visible. Prouvé en réintroduisant un
 * second `<ProductsFilterSheet />` dans `produits/page.tsx` — le test rougit.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = process.cwd();

/**
 * Les 8 listes admin : la page, sa barre basse, et le nom du composant de feuille.
 *
 * `orders` figurait ici avec DEUX composants distincts (`OrdersFilterDrawer` 331 l. +
 * `OrdersFilterSheet` 673 l.) jusqu'au 2026-08-07 — 1 004 lignes pour un filtre, et
 * deux endroits où brancher tout nouveau critère. Le tiroir a été supprimé.
 */
const LISTS = [
	{
		page: "app/admin/catalogue/produits/page.tsx",
		bottomBar: "modules/products/components/admin/products-bottom-bar.tsx",
		sheet: "ProductsFilterSheet",
	},
	{
		page: "app/admin/catalogue/produits/[slug]/variantes/page.tsx",
		bottomBar: "modules/skus/components/admin/skus-bottom-bar.tsx",
		sheet: "SkusFilterSheet",
	},
	{
		page: "app/admin/catalogue/collections/page.tsx",
		bottomBar: "modules/collections/components/admin/collections-bottom-bar.tsx",
		sheet: "CollectionsFilterSheet",
	},
	{
		page: "app/admin/ventes/commandes/page.tsx",
		bottomBar: "modules/orders/components/admin/orders-bottom-bar.tsx",
		sheet: "OrdersFilterSheet",
	},
	{
		page: "app/admin/ventes/remboursements/page.tsx",
		bottomBar: "modules/refunds/components/admin/refunds-bottom-bar.tsx",
		sheet: "RefundsFilterSheet",
	},
	// Les trois taxonomies partagent le générique `TaxonomyFilterSheet`, monté par
	// `taxonomy-bottom-bar.tsx` — leurs pages ne doivent donc en monter aucune.
	{
		page: "app/admin/catalogue/couleurs/page.tsx",
		bottomBar: "modules/taxonomies/components/taxonomy-bottom-bar.tsx",
		sheet: "TaxonomyFilterSheet",
	},
	{
		page: "app/admin/catalogue/materiaux/page.tsx",
		bottomBar: "modules/taxonomies/components/taxonomy-bottom-bar.tsx",
		sheet: "TaxonomyFilterSheet",
	},
	{
		page: "app/admin/catalogue/types-de-produits/page.tsx",
		bottomBar: "modules/taxonomies/components/taxonomy-bottom-bar.tsx",
		sheet: "TaxonomyFilterSheet",
	},
] as const;

function read(relative: string): string {
	return readFileSync(join(ROOT, relative), "utf-8");
}

/** Compte les montages JSX `<Nom` (ouvrant ou auto-fermant), pas les imports ni la prose. */
function countMounts(source: string, component: string): number {
	return (source.match(new RegExp(`<${component}[\\s/>]`, "g")) ?? []).length;
}

describe("@regression admin-filter-surface-single-mount", () => {
	it.each(LISTS.map((l) => [l.page, l] as const))(
		"%s ne monte pas de seconde feuille de filtres",
		(_label, list) => {
			const mounts = countMounts(read(list.page), list.sheet);

			expect(
				mounts,
				`${list.page} monte <${list.sheet}> ${mounts} fois. La feuille appartient à ` +
					`${list.bottomBar}, qui la pilote par le SheetStore partagé ; la toolbar desktop ` +
					`doit rendre <FilterTriggerButton />, pas une seconde instance (elle aurait son ` +
					`propre brouillon de filtres, invisible depuis l'autre déclencheur).`,
			).toBe(0);
		},
	);

	it.each(LISTS.map((l) => [l.page] as const))("%s rend bien le déclencheur desktop", (page) => {
		expect(
			countMounts(read(page), "FilterTriggerButton"),
			`${page} ne rend aucun <FilterTriggerButton /> : sans lui, la toolbar desktop ` +
				`n'a plus aucun moyen d'ouvrir les filtres (la barre basse est \`md:hidden\`).`,
		).toBe(1);
	});

	it.each([...new Set(LISTS.map((l) => l.bottomBar))].map((b) => [b] as const))(
		"%s monte la feuille exactement une fois, en mode contrôlé",
		(bottomBar) => {
			const source = read(bottomBar);
			const sheet = LISTS.find((l) => l.bottomBar === bottomBar)!.sheet;

			expect(countMounts(source, sheet), `${bottomBar} doit monter <${sheet}> une seule fois`).toBe(
				1,
			);
			expect(
				source.includes("hideTrigger"),
				`${bottomBar} doit passer \`hideTrigger\` : son déclencheur est l'item de la ` +
					`StickyActionBar, pas le bouton intégré de FilterSheetWrapper (sinon deux ` +
					`boutons « Filtres » se superposent sous md).`,
			).toBe(true);
		},
	);
});
