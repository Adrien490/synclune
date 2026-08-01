/**
 * @regression qs-close-reclaims-history-entry
 *
 * Chaque cycle ouvrir→fermer du quick search laissait une entrée d'historique
 * ORPHELINE (audit recherche 2026-08-01, P2-1) : `useBackButtonClose` (dans le
 * wrapper `ui/dialog`) pousse une entrée à l'ouverture et ne la reprend que via
 * son `handleClose`, atteint par `onOpenChange`. Or le bouton × et le
 * swipe-to-dismiss appelaient `close()` du store DIRECTEMENT : la prop
 * contrôlée passait à `false` sans que Radix n'émette `onOpenChange` — l'entrée
 * restait dans l'historique, et la pression suivante sur le retour matériel
 * était avalée (URL identique, rien ne bouge). Une pression morte par cycle,
 * cumulatif.
 *
 * Et les fermetures-navigation (Enter, « Voir tous les résultats ») utilisaient
 * `router.push` : l'entrée poussée (même URL que la page d'origine) restait
 * enterrée sous la destination — une pression retour morte par cycle
 * ouvrir→naviguer. Prescription CLAUDE.md (§ Overlays) : naviguer en
 * **`replace`** pour la consommer.
 *
 * Correctifs verrouillés ici :
 * - × = `DialogClose` (chemin Radix `onOpenChange` → reprise de l'entrée) ;
 * - swipe → `click()` de ce même bouton (même chemin) ;
 * - `navigateToSearch` → `router.replace`.
 *
 * Monte le VRAI `ui/dialog` (Radix + useBackButtonClose) — un mock du wrapper
 * rendrait le test aveugle à cette chaîne (cf. menu-sheet-link-navigation).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { createElement } from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockPush, mockReplace, mockQuickSearch, mockSearchParams } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockPush: vi.fn(),
	mockReplace: vi.fn(),
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
	useRouter: () => ({ push: mockPush, replace: mockReplace, prefetch: vi.fn() }),
	useSearchParams: () => mockSearchParams,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
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

// Mock stable d'useAppForm — même pattern que search-input.test.tsx.
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

let backSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.clearAllMocks();
	mockSearchParams.get.mockReturnValue(null);
	mockSearchParams.toString.mockReturnValue("");
	backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
});

afterEach(() => {
	backSpy.mockRestore();
	cleanup();
});

async function renderDialog() {
	render(
		createElement(QuickSearchDialog, {
			collections: [],
			productTypes: [],
			recentlyViewed: [],
		}),
	);
	const input = (await screen.findByRole("combobox", {
		name: /rechercher un bijou/i,
	})) as HTMLInputElement;
	return input;
}

// ============================================================================
// TESTS
// ============================================================================

describe("QuickSearchDialog — reprise de l'entrée d'historique à la fermeture", () => {
	it("le bouton × reprend l'entrée poussée à l'ouverture (history.back)", async () => {
		await renderDialog();

		const closeButton = screen.getByRole("button", { name: "Fermer" });
		fireEvent.click(closeButton);
		await act(async () => {});

		// Avec le bug, × appelait close() du store directement : la prop contrôlée
		// passait à false sans onOpenChange, l'entrée restait orpheline et la
		// pression retour suivante était avalée.
		expect(backSpy).toHaveBeenCalled();
		expect(mockClose).toHaveBeenCalled();
	});

	it("le swipe-to-dismiss passe par le même chemin (history.back)", async () => {
		await renderDialog();

		const header = document.querySelector("[data-slot='dialog-content'] header")!;
		// changedTouches est requis : react-remove-scroll (monté par le vrai
		// ui/dialog) lit event.changedTouches[0].clientX dans ses listeners
		// document — un touch event sans lui fait planter le run (uncaught).
		fireEvent.touchStart(header, {
			touches: [{ clientX: 0, clientY: 100 }],
			changedTouches: [{ clientX: 0, clientY: 100 }],
		});
		fireEvent.touchMove(header, {
			touches: [{ clientX: 0, clientY: 300 }],
			changedTouches: [{ clientX: 0, clientY: 300 }],
		});
		fireEvent.touchEnd(header, { changedTouches: [{ clientX: 0, clientY: 300 }] });
		await act(async () => {});

		expect(backSpy).toHaveBeenCalled();
		expect(mockClose).toHaveBeenCalled();
	});

	it("Enter navigue en REPLACE (consomme l'entrée), jamais en push", async () => {
		const input = await renderDialog();

		fireEvent.change(input, { target: { value: "bague" } });
		await act(async () => {});

		const form = input.closest("form")!;
		fireEvent.submit(form);
		await act(async () => {});

		expect(mockReplace).toHaveBeenCalledWith("/produits?search=bague");
		expect(mockPush).not.toHaveBeenCalled();
	});
});
