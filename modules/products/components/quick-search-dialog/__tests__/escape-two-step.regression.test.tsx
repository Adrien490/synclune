/**
 * @regression qs-escape-two-step-real-radix
 *
 * L'« Escape en deux temps » (1ʳᵉ pression = vider le champ, 2ᵉ = fermer) était
 * MORT dans le dialog composé (audit recherche 2026-08-01, P1-2) : Radix
 * `DismissableLayer` écoute `keydown` sur `document` en **capture** et dismisse
 * si `!event.defaultPrevented` — or à cet instant le handler React du champ
 * (phase bulle) n'a pas encore tourné, son `stopPropagation`/`preventDefault`
 * arrive toujours trop tard. Escape avec du texte fermait donc le dialog entier.
 *
 * Invisible des tests existants : `search-input.test.tsx` teste le champ ISOLÉ
 * (sans Radix), `quick-search-dialog.test.tsx` mocke `ui/dialog` ET
 * `search-input`, et les deux E2E Escape pressent champ vide. Même famille
 * d'angle mort que `menu-sheet-link-navigation.regression` : « un mock du
 * wrapper rend le test aveugle à cette chaîne ».
 *
 * Ce test monte donc le VRAI `ui/dialog` (Radix) et le VRAI `search-input` —
 * seuls les feuilles (actions serveur, store, contenus) sont mockées.
 * Le correctif vit dans `onEscapeKeyDown` de `DialogContent`
 * (`quick-search-dialog.tsx`) : texte présent → `preventDefault()` + clear ;
 * champ vide → dismiss Radix (chemin `onOpenChange`, qui reprend l'entrée
 * d'historique du wrapper).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { createElement } from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockQuickSearch, mockSearchParams } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockQuickSearch: vi.fn().mockResolvedValue({
		kind: "success",
		products: [],
		suggestion: null,
		totalCount: 0,
	}),
	mockSearchParams: {
		get: vi.fn().mockReturnValue(null),
		toString: vi.fn().mockReturnValue(""),
	},
}));

// ============================================================================
// MODULE MOCKS — uniquement les FEUILLES ; ui/dialog et search-input restent réels
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
	useSearchParams: () => mockSearchParams,
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({
		isOpen: true,
		data: undefined,
		open: vi.fn(),
		close: mockClose,
		toggle: vi.fn(),
		clearData: vi.fn(),
	}),
}));

vi.mock("@/modules/products/actions/quick-search", () => ({
	quickSearch: mockQuickSearch,
}));

vi.mock("@/modules/products/hooks/use-add-recent-search", () => ({
	useAddRecentSearch: () => ({ add: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/products/hooks/use-recent-searches", () => ({
	useRecentSearches: () => ({
		searches: [],
		remove: vi.fn(),
		clear: vi.fn(),
		isPending: false,
	}),
}));

vi.mock("../idle-content", () => ({
	IdleContent: () => {
		const { createElement: h } = require("react");
		return h("div", { "data-testid": "idle-content" });
	},
}));

vi.mock("../quick-search-content", () => ({
	QuickSearchContent: () => {
		const { createElement: h } = require("react");
		return h("div", { "data-testid": "quick-search-content" });
	},
}));

vi.mock("../search-result-item", () => ({
	SearchResultsSkeleton: () => {
		const { createElement: h } = require("react");
		return h("div", { "data-testid": "results-skeleton" });
	},
}));

vi.mock("../search-error-state", () => ({
	SearchErrorState: () => {
		const { createElement: h } = require("react");
		return h("div", { "data-testid": "search-error" });
	},
}));

vi.mock("../quick-tag-pills", () => ({
	QuickTagPills: () => null,
}));

vi.mock("@/shared/components/animations/fade", () => ({
	Fade: ({ children }: { children?: unknown }) => children,
}));

vi.mock("motion/react", () => {
	const { forwardRef: fRef, createElement: h } = require("react");
	const passthrough = (tag: string) =>
		fRef(
			(
				{
					children,
					initial: _i,
					animate: _a,
					exit: _e,
					transition: _t,
					...props
				}: Record<string, unknown> & { children?: unknown },
				ref: unknown,
			) => h(tag, { ref, ...props }, children),
		);
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		MotionConfig: ({ children }: { children: unknown }) => children,
		m: { span: passthrough("span"), div: passthrough("div") },
		useReducedMotion: vi.fn(() => true),
	};
});

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-register-overlay", () => ({
	useRegisterOverlay: vi.fn(),
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Mock stable d'useAppForm — même pattern que search-input.test.tsx : AppField
// à identité stable (sinon React remonte le sous-arbre et le <input> capturé
// par le test devient un nœud détaché — test vert pour la mauvaise raison).
vi.mock("@/shared/components/forms", () => {
	const { useState, useRef, useReducer } = require("react");

	function useAppForm({ defaultValues }: { defaultValues: { search: string } }) {
		const valueRef = useRef(defaultValues.search);
		const [, forceRender] = useReducer((x: number) => x + 1, 0);

		const setValue = (v: string) => {
			valueRef.current = v;
			forceRender();
		};

		const [AppField] = useState(
			() =>
				function AppField({
					children,
					validators,
				}: {
					children: (field: {
						state: { value: string };
						handleChange: (v: string) => void;
					}) => unknown;
					validators?: {
						onChangeAsync?: (opts: { value: string }) => Promise<undefined>;
					};
					name: string;
				}) {
					return children({
						state: { value: valueRef.current },
						handleChange: (v: string) => {
							setValue(v);
							void validators?.onChangeAsync?.({ value: v });
						},
					}) as unknown;
				},
		);

		return {
			AppField,
			setFieldValue: (_name: string, v: string) => setValue(v),
			getFieldValue: (_name: string) => valueRef.current,
		};
	}

	return { useAppForm };
});

// Import APRÈS les mocks
import { QuickSearchDialog } from "../quick-search-dialog";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockSearchParams.get.mockReturnValue(null);
	mockSearchParams.toString.mockReturnValue("");
});

afterEach(cleanup);

async function renderDialog() {
	render(
		createElement(QuickSearchDialog, {
			collections: [],
			productTypes: [],
		}),
	);
	// Radix monte le contenu dans un Portal — attendre le champ.
	const input = (await screen.findByRole("combobox", {
		name: /rechercher un bijou/i,
	})) as HTMLInputElement;
	return input;
}

// ============================================================================
// TESTS
// ============================================================================

describe("QuickSearchDialog — Escape en deux temps (vrai Radix + vrai SearchInput)", () => {
	it("1ʳᵉ pression avec du texte : vide le champ SANS fermer le dialog", async () => {
		const input = await renderDialog();

		fireEvent.change(input, { target: { value: "bague" } });
		await act(async () => {});
		expect(input.value).toBe("bague");

		fireEvent.keyDown(input, { key: "Escape" });
		await act(async () => {});

		// Avec le bug, le capture-handler document de Radix dismissait AVANT le
		// stopPropagation du champ : close() était appelé dès la 1ʳᵉ pression.
		expect(mockClose).not.toHaveBeenCalled();
		expect(input.value).toBe("");
	});

	it("2ᵉ pression (champ vide) : ferme via le chemin Radix onOpenChange", async () => {
		const input = await renderDialog();

		fireEvent.change(input, { target: { value: "bague" } });
		await act(async () => {});
		fireEvent.keyDown(input, { key: "Escape" });
		await act(async () => {});
		expect(mockClose).not.toHaveBeenCalled();

		fireEvent.keyDown(input, { key: "Escape" });
		await act(async () => {});

		expect(mockClose).toHaveBeenCalled();
	});
});
