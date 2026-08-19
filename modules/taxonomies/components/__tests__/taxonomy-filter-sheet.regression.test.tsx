import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as React from "react";

/**
 * @regression taxonomy-filter-sheet-url-sync-2026-08-19
 *
 * Deux comportements de `TaxonomyFilterSheet` corrigent des bugs constatés, et
 * n'étaient tenus que par leurs commentaires :
 *
 *  - **Resynchronisation à l'ouverture.** `defaultValues` n'est lu qu'au
 *    premier montage et la feuille reste montée en permanence : sans le
 *    `form.reset(initialValues)` de `handleOpenChangeWithSync`, retirer un
 *    badge ou revenir en arrière laissait la feuille rouvrir sur la sélection
 *    PRÉCÉDENTE, en contradiction avec l'URL et les badges.
 *
 *  - **Purge du curseur.** La pagination est curseur : appliquer OU
 *    réinitialiser un filtre depuis la page 2 sans retirer `cursor` /
 *    `direction` renvoyait une tranche incohérente (curseur périmé sur un
 *    ensemble refiltré).
 *
 * S'y ajoute le repli sur la valeur neutre pour une valeur d'URL hors options
 * (lien périmé, saisie manuelle) — sans lui, le groupe de radios se rendait
 * sans sélection.
 */

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRouterPush, mockSearchParams, mockUseTransition } = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockSearchParams: { current: new URLSearchParams() },
	mockUseTransition: vi.fn(
		() => [false, (fn: () => void) => fn()] as [boolean, (fn: () => void) => void],
	),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
	useSearchParams: () => mockSearchParams.current,
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof React>();
	return { ...actual, useTransition: mockUseTransition };
});

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		onOpenChange,
		onClearAll,
		onApply,
	}: {
		children: React.ReactNode;
		onOpenChange?: (open: boolean) => void;
		onClearAll?: () => void;
		onApply?: () => void;
	}) => (
		<div data-testid="filter-sheet-wrapper">
			<button data-testid="btn-open" onClick={() => onOpenChange?.(true)}>
				Ouvrir
			</button>
			<button data-testid="btn-clear" onClick={onClearAll}>
				Tout effacer
			</button>
			<button data-testid="btn-apply" onClick={onApply}>
				Appliquer
			</button>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/forms/radio-filter-item", () => ({
	RadioFilterItem: ({
		id,
		name,
		value,
		checked,
		onCheckedChange,
		children,
	}: {
		id: string;
		name: string;
		value: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
		children: React.ReactNode;
	}) => (
		<label htmlFor={id}>
			<input
				type="radio"
				id={id}
				name={name}
				value={value}
				checked={checked}
				onChange={(e) => onCheckedChange(e.target.checked)}
				data-testid={`radio-${value}`}
			/>
			{children}
		</label>
	),
}));

// Mock de @tanstack/react-form : `reset` espionné, état par champ rejouable —
// même échafaudage que collections-filter-sheet.test.tsx.
const mockHandleSubmit = vi.fn();
const mockFormReset = vi.fn();
const fieldStateMap: Record<string, unknown> = {};

vi.mock("@tanstack/react-form", () => {
	const useForm = ({
		defaultValues,
		onSubmit,
	}: {
		defaultValues: Record<string, unknown>;
		onSubmit: (args: { value: unknown }) => Promise<void>;
	}) => ({
		handleSubmit: mockHandleSubmit.mockImplementation(() =>
			onSubmit({ value: { ...defaultValues, ...fieldStateMap } }),
		),
		reset: mockFormReset,
		Field: ({
			name,
			children,
		}: {
			name: string;
			children: (field: {
				state: { value: unknown };
				handleChange: (v: unknown) => void;
			}) => React.ReactNode;
		}) =>
			children({
				state: { value: name in fieldStateMap ? fieldStateMap[name] : defaultValues[name] },
				handleChange: (v: unknown) => {
					fieldStateMap[name] = v;
				},
			}),
		defaultValues,
	});
	return {
		createFormHookContexts: () => ({
			fieldContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
			useFieldContext: () => ({}),
			formContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
			useFormContext: () => ({}),
		}),
		createFormHook: () => ({ useAppForm: useForm }),
		useForm,
	};
});

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { TaxonomyFilterSheet } from "../taxonomy-filter-sheet";
import { TAXONOMY_CONFIG } from "../../config/taxonomy.config";

const PRODUCT_TYPE = TAXONOMY_CONFIG["product-type"];

beforeEach(() => {
	vi.clearAllMocks();
	mockSearchParams.current = new URLSearchParams();
	for (const key of Object.keys(fieldStateMap)) delete fieldStateMap[key];
});

afterEach(cleanup);

/** Query string du dernier `router.push`, parsée. */
function lastPushedParams(): URLSearchParams {
	const url = mockRouterPush.mock.lastCall?.[0] as string;
	return new URLSearchParams(url.replace(/^\?/, ""));
}

describe("TaxonomyFilterSheet — la feuille suit l'URL", () => {
	it("ne rend RIEN pour une taxonomie sans filtre (le contrat du registre)", () => {
		const { container } = render(<TaxonomyFilterSheet config={TAXONOMY_CONFIG.color} />);

		expect(container).toBeEmptyDOMElement();
	});

	it("initialise la sélection depuis l'URL", () => {
		mockSearchParams.current = new URLSearchParams("filter_hasProducts=true");
		render(<TaxonomyFilterSheet config={PRODUCT_TYPE} />);

		expect(screen.getByTestId("radio-true")).toBeChecked();
		expect(screen.getByTestId("radio-all")).not.toBeChecked();
	});

	it("retombe sur la valeur neutre pour une valeur d'URL hors options", () => {
		// Lien périmé ou saisie manuelle : le groupe garde une sélection.
		mockSearchParams.current = new URLSearchParams("filter_hasProducts=bogus");
		render(<TaxonomyFilterSheet config={PRODUCT_TYPE} />);

		expect(screen.getByTestId("radio-all")).toBeChecked();
	});

	// ⚠️ LE bug historique : la feuille reste montée en permanence et
	// `defaultValues` n'est lu qu'au montage — sans resync, elle rouvrait sur la
	// sélection précédente après un badge retiré ou un retour arrière.
	it("resynchronise le formulaire sur l'URL COURANTE à l'ouverture", () => {
		mockSearchParams.current = new URLSearchParams("filter_hasProducts=true");
		const { rerender } = render(
			<TaxonomyFilterSheet config={PRODUCT_TYPE} open={false} onOpenChange={vi.fn()} />,
		);

		// L'URL change ailleurs (badge retiré, « Tout effacer », back).
		mockSearchParams.current = new URLSearchParams();
		rerender(<TaxonomyFilterSheet config={PRODUCT_TYPE} open={false} onOpenChange={vi.fn()} />);

		fireEvent.click(screen.getByTestId("btn-open"));

		expect(mockFormReset).toHaveBeenCalledWith({ hasProducts: "all" });
	});

	it("l'application écrit le filtre et PURGE cursor/direction", () => {
		// Depuis la page 2 : un curseur est en place.
		mockSearchParams.current = new URLSearchParams(
			"cursor=abc&direction=forward&search=collier&sortBy=label-descending",
		);
		render(<TaxonomyFilterSheet config={PRODUCT_TYPE} />);

		fieldStateMap.hasProducts = "true";
		fireEvent.click(screen.getByTestId("btn-apply"));

		const pushed = lastPushedParams();
		expect(pushed.get("filter_hasProducts")).toBe("true");
		// Le curseur pointait dans un ensemble non filtré : il est périmé.
		expect(pushed.has("cursor")).toBe(false);
		expect(pushed.has("direction")).toBe(false);
		// Recherche et tri, eux, survivent au changement de filtre.
		expect(pushed.get("search")).toBe("collier");
		expect(pushed.get("sortBy")).toBe("label-descending");
	});

	it("la valeur neutre EFFACE le paramètre au lieu de l'écrire", () => {
		mockSearchParams.current = new URLSearchParams("filter_hasProducts=true");
		render(<TaxonomyFilterSheet config={PRODUCT_TYPE} />);

		fieldStateMap.hasProducts = "all";
		fireEvent.click(screen.getByTestId("btn-apply"));

		expect(lastPushedParams().has("filter_hasProducts")).toBe(false);
	});

	it("la réinitialisation purge filtres ET curseur, et réaligne le formulaire", () => {
		mockSearchParams.current = new URLSearchParams(
			"filter_hasProducts=true&cursor=abc&direction=forward",
		);
		render(<TaxonomyFilterSheet config={PRODUCT_TYPE} />);

		fireEvent.click(screen.getByTestId("btn-clear"));

		expect(mockFormReset).toHaveBeenCalledWith({ hasProducts: "all" });
		const pushed = lastPushedParams();
		expect(pushed.has("filter_hasProducts")).toBe(false);
		expect(pushed.has("cursor")).toBe(false);
		expect(pushed.has("direction")).toBe(false);
	});
});
