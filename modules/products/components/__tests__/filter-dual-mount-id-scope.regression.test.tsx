/**
 * @regression filter-dual-mount-id-scope
 *
 * Le corps de filtres est monté **DEUX FOIS** dans le même document : le rail
 * (`hidden lg:block`, donc présent à tous les viewports, masqué en CSS et non
 * démonté) et le panneau (< `lg`). Chaque `id` doit donc porter son hôte.
 *
 * Le défaut, mesuré dans le navigateur avant correctif : les deux instances
 * émettaient `color-or-jaune`, `filter-compartment-colors`, `filter-in-stock`…
 * Or `CheckboxFilterItem` est un `<label htmlFor>`, et HTML résout un `for`
 * vers le PREMIER élément portant l'id — celui du rail masqué. Conséquence
 * concrète : taper une ligne du panneau mobile ne cochait rien de visible et le
 * compteur vivant restait figé (« Voir les 48 pièces » → 48). Rien ne le
 * signalait : ni `tsc`, ni ESLint, ni un test qui monte UN seul hôte.
 *
 * Ce test monte les DEUX hôtes ensemble — la seule configuration où le défaut
 * existe — et vérifie qu'aucun `id` n'est partagé.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FilterFormData } from "@/modules/products/services/product-filter-params.service";

// ============================================================================
// MOCKS — on garde les vrais `id`, c'est le sujet du test
// ============================================================================

vi.mock("@/shared/hooks/use-haptic", () => ({ useHaptic: () => vi.fn() }));

vi.mock("@/modules/colors/utils/color-contrast.utils", () => ({
	isLightColor: () => false,
	getContrastTextColor: () => "#ffffff",
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CheckIcon: () => <span />,
	CircleIcon: () => <span />,
	MagnifyingGlassIcon: () => <span />,
	CaretDownIcon: () => <span />,
	CaretUpIcon: () => <span />,
	XIcon: () => <span />,
}));

import { ProductFilterCompartments } from "../product-filter-compartments";

// ============================================================================
// FIXTURES
// ============================================================================

const baseDate = new Date("2026-01-01");

const colors = [
	{
		id: "c-or",
		slug: "or-jaune",
		name: "Or jaune",
		hex: "#FFD700",
		isActive: true,
		description: null,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 38 },
	},
];

const materials = [{ id: "m-acier", slug: "acier", name: "Acier", _count: { skus: 15 } }];
const productTypes = [{ slug: "bagues", label: "Bagues", _count: { products: 20 } }];

const values: FilterFormData = {
	colors: [],
	materials: [],
	productTypes: [],
	priceRange: [0, 500],
	inStockOnly: false,
	onSale: false,
	sortBy: "created-descending",
};

const counts = { types: 0, price: 0, colors: 0, materials: 0, availability: 0 };

const noop = () => {};

function renderBothHosts() {
	const shared = {
		productTypes,
		colors,
		materials,
		maxPriceInEuros: 500,
		values,
		counts,
		onToggle: noop,
		onPriceChange: noop,
		onAvailabilityChange: noop,
		onSectionReset: noop,
		sortOptions: [{ value: "created-descending", label: "Plus récents" }],
		onSortChange: noop,
	};
	return render(
		<>
			<ProductFilterCompartments host="rail" {...shared} />
			<ProductFilterCompartments host="sheet" {...shared} />
		</>,
	);
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("@regression filter-dual-mount-id-scope", () => {
	it("aucun id n'est partagé entre le rail et le panneau", () => {
		const { container } = renderBothHosts();

		const counts = new Map<string, number>();
		for (const el of container.querySelectorAll("[id]")) {
			counts.set(el.id, (counts.get(el.id) ?? 0) + 1);
		}
		const duplicates = [...counts].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);

		expect(
			duplicates,
			"ids partagés entre les deux hôtes : chaque `<label htmlFor>` du panneau " +
				"résoudra vers le contrôle du RAIL masqué (premier dans le document).",
		).toEqual([]);
	});

	it("chaque htmlFor de label cible un contrôle DANS le même hôte", () => {
		// L'assertion qui attrape vraiment le bug : un id unique ne suffit pas, il
		// faut que l'association pointe vers le bon sous-arbre.
		const { container } = renderBothHosts();
		const offenders: string[] = [];

		for (const label of container.querySelectorAll<HTMLLabelElement>("label[for]")) {
			const target = container.querySelector(`#${CSS.escape(label.htmlFor)}`);
			const labelHost = label.closest("[data-filter-host]")?.getAttribute("data-filter-host");
			const targetHost = target?.closest("[data-filter-host]")?.getAttribute("data-filter-host");
			if (!target) offenders.push(`${label.htmlFor} → cible absente`);
			else if (labelHost !== targetHost) {
				offenders.push(`${label.htmlFor} : label dans ${labelHost}, cible dans ${targetHost}`);
			}
		}

		expect(offenders, offenders.join("\n")).toEqual([]);
	});

	it("les deux hôtes rendent bien le même nombre de compartiments (prémisse)", () => {
		// Sanity : si un hôte cessait de rendre, les deux tests ci-dessus passeraient
		// à vide — c'est précisément le double montage qui rend le défaut possible.
		const { container } = renderBothHosts();
		// 6 compartiments par hôte depuis l'ajout de « Trier par » (2026-08-06).
		const sections = container.querySelectorAll('section[aria-labelledby^="filter-compartment-"]');
		expect(sections.length).toBe(12);
	});
});
