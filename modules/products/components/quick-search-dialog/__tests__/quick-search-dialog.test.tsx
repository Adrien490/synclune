import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockIsOpen,
	mockClose,
	mockRouterPush,
	mockRouterReplace,
	mockAdd,
	mockSearches,
	mockRemove,
	mockClear,
	mockIsSearchMode,
	mockIsSearching,
	mockInputValue,
	mockSearchResults,
	mockSearchQuery,
	mockHandleInputValueChange,
	mockHandleLiveSearch,
	mockHandleSearchFromSuggestion,
	mockReset,
	mockHandleArrowNavigation,
	mockFocusFirst,
	mockResetActiveIndex,
	mockActiveDescendantId,
	mockContentRef,
} = vi.hoisted(() => ({
	mockIsOpen: { current: true },
	mockClose: vi.fn(),
	mockRouterPush: vi.fn(),
	mockRouterReplace: vi.fn(),
	mockAdd: vi.fn(),
	mockSearches: { current: [] as string[] },
	mockRemove: vi.fn(),
	mockClear: vi.fn(),
	mockIsSearchMode: { current: false },
	mockIsSearching: { current: false },
	mockInputValue: { current: "" },
	mockSearchResults: { current: null as unknown },
	mockSearchQuery: { current: "" },
	mockHandleInputValueChange: vi.fn(),
	mockHandleLiveSearch: vi.fn(),
	mockHandleSearchFromSuggestion: vi.fn(),
	mockReset: vi.fn(),
	mockHandleArrowNavigation: vi.fn(),
	mockFocusFirst: vi.fn(),
	mockResetActiveIndex: vi.fn(),
	mockActiveDescendantId: { current: undefined as string | undefined },
	mockContentRef: { current: null as HTMLElement | null },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: (id: string) => {
		if (id === "quick-search") {
			return { isOpen: mockIsOpen.current, close: mockClose };
		}
		return { isOpen: false, close: vi.fn(), open: vi.fn() };
	},
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
}));

vi.mock("@/modules/products/hooks/use-add-recent-search", () => ({
	useAddRecentSearch: () => ({ add: mockAdd }),
}));

vi.mock("@/modules/products/hooks/use-recent-searches", () => ({
	useRecentSearches: () => ({
		searches: mockSearches.current,
		remove: mockRemove,
		clear: mockClear,
	}),
}));

vi.mock("../use-keyboard-navigation", () => ({
	useKeyboardNavigation: () => ({
		contentRef: mockContentRef,
		handleArrowNavigation: mockHandleArrowNavigation,
		focusFirst: mockFocusFirst,
		resetActiveIndex: mockResetActiveIndex,
		activeDescendantId: mockActiveDescendantId.current,
	}),
}));

vi.mock("../use-quick-search", () => ({
	isSearchError: (v: unknown) => v != null && typeof v === "object" && "type" in (v as object),
	useQuickSearch: () => ({
		inputValue: mockInputValue.current,
		searchResults: mockSearchResults.current,
		searchQuery: mockSearchQuery.current,
		isSearching: mockIsSearching.current,
		isSearchMode: mockIsSearchMode.current,
		handleInputValueChange: mockHandleInputValueChange,
		handleLiveSearch: mockHandleLiveSearch,
		handleSearchFromSuggestion: mockHandleSearchFromSuggestion,
		reset: mockReset,
	}),
}));

vi.mock("../idle-content", () => ({
	IdleContent: ({
		searches,
		collections,
		isPending,
		onClose,
		onRecentSearch,
		onRemoveSearch,
		onClearSearches,
	}: {
		recentlyViewed: unknown[];
		searches: string[];
		collections: unknown[];
		isPending: boolean;
		onClose: () => void;
		onRecentSearch: (term: string) => void;
		onRemoveSearch: (term: string) => void;
		onClearSearches: () => void;
	}) => (
		<div
			data-testid="idle-content"
			data-searches={searches.length}
			data-collections={collections.length}
			data-is-pending={isPending}
		>
			<button onClick={onClose} data-testid="idle-close-button">
				Fermer
			</button>
			<button onClick={() => onRecentSearch("bague")} data-testid="idle-recent-search">
				Recent search
			</button>
			<button onClick={() => onRemoveSearch("bague")} data-testid="idle-remove-search">
				Remove search
			</button>
			<button onClick={onClearSearches} data-testid="idle-clear-searches">
				Clear searches
			</button>
		</div>
	),
}));

vi.mock("../quick-search-content", () => ({
	QuickSearchContent: ({
		results: _results,
		query,
		onSearch,
		onClose,
		onSelectResult,
		onViewAllResults,
	}: {
		results: unknown;
		query: string;
		collections: unknown[];
		productTypes: unknown[];
		onSearch: (term: string) => void;
		onClose: () => void;
		onSelectResult: () => void;
		onViewAllResults: () => void;
	}) => (
		<div data-testid="quick-search-content" data-query={query}>
			{/* Le vrai composant rend le `role="listbox"` sur un élément INTERNE
				(`LISTBOX_ID`), qui n'enveloppe que des groupes d'options — le rôle ne
				porte plus sur `#qs-results`, qui contient aussi l'état vide, la
				suggestion, les erreurs et le CTA. Le mock doit refléter ce contrat,
				sinon l'assertion F3 ci-dessous testerait le mock et non le composant. */}
			<div id="qs-listbox" role="listbox" aria-label="Résultats de recherche" />
			<button onClick={onClose} data-testid="content-close-button">
				Fermer
			</button>
			<button onClick={() => onSearch("collier")} data-testid="content-search-button">
				Search
			</button>
			<button onClick={onSelectResult} data-testid="content-select-result">
				Select result
			</button>
			<button onClick={onViewAllResults} data-testid="content-view-all">
				View all
			</button>
		</div>
	),
}));

vi.mock("../quick-tag-pills", () => ({
	QuickTagPills: ({
		productTypes,
		onSelect,
	}: {
		productTypes: { slug: string; label: string }[];
		onSelect: (label: string) => void;
		size?: string;
	}) => (
		<div data-testid="quick-tag-pills">
			{productTypes.map((t) => (
				<button key={t.slug} onClick={() => onSelect(t.label)} data-testid={`tag-${t.slug}`}>
					{t.label}
				</button>
			))}
		</div>
	),
}));

vi.mock("../search-result-item", () => ({
	SearchResultsSkeleton: () => <div data-testid="search-results-skeleton" />,
}));

vi.mock("@/shared/components/animations/fade", () => ({
	Fade: ({ children }: { children: React.ReactNode; y?: number; className?: string }) => (
		<>{children}</>
	),
}));

// Mock minimal de SearchInput. Il rend `<form role="search">` comme le vrai
// composant (le landmark `search` vient du <form>, pas du dialog) et consomme
// l'attribut DOM standard `aria-label`. Ce mock vérifie que QuickSearchDialog
// *passe* le bon attribut ; la garantie que SearchInput le *consomme* est
// couverte par search-input.test.tsx. Ne pas rendre ce mock plus permissif
// que le vrai composant (props ARIA en kebab-case, comme l'API réelle).
vi.mock("@/shared/components/search-input", () => ({
	SearchInput: ({
		onSubmit,
		onEscape,
		onKeyDown,
		"aria-label": ariaLabel,
		autoFocus: _autoFocus,
	}: {
		paramName: string;
		debounceMs?: number;
		size?: string;
		placeholder?: string;
		"aria-label"?: string;
		autoFocus?: boolean;
		preventMobileBlur?: boolean;
		isPending?: boolean;
		onLiveSearch?: (value: string) => void;
		onEscape?: () => void;
		onValueChange?: (value: string) => void;
		onSubmit?: (value: string) => void;
		"aria-activedescendant"?: string;
		"aria-expanded"?: boolean;
		"aria-controls"?: string;
		onKeyDown?: (e: React.KeyboardEvent) => void;
		ref?: unknown;
	}) => (
		<form role="search">
			<input
				data-testid="search-input"
				aria-label={ariaLabel}
				onKeyDown={(e) => {
					if (e.key === "Enter" && onSubmit) onSubmit("test query");
					if (e.key === "Escape" && onEscape) onEscape();
					if (onKeyDown) onKeyDown(e);
				}}
			/>
		</form>
	),
}));

vi.mock("@/shared/components/ui/dialog", () => {
	// Modélise le contrat Radix : un clic sur DialogClose invoque le
	// `onOpenChange(false)` du Dialog parent — c'est ce chemin (et non un
	// onClick direct) que le × emprunte depuis le fix historique
	// (close-reclaims-history.regression.test.tsx). Un mock fragment rendrait
	// le clic inerte et le test aveugle.
	const onOpenChangeRef: { current: ((open: boolean) => void) | null } = { current: null };

	return {
		Dialog: ({
			open,
			onOpenChange,
			children,
		}: {
			open: boolean;
			onOpenChange: (open: boolean) => void;
			children: React.ReactNode;
		}) => {
			onOpenChangeRef.current = onOpenChange;
			return (
				<div data-testid="dialog" data-open={open}>
					{open && children}
					<button onClick={() => onOpenChange(false)} data-testid="dialog-overlay-close">
						Close overlay
					</button>
				</div>
			);
		},
		DialogClose: ({ children }: { children: React.ReactNode; asChild?: boolean }) => {
			const { cloneElement, isValidElement } = require("react");
			if (isValidElement(children)) {
				return cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
					onClick: () => onOpenChangeRef.current?.(false),
				});
			}
			return <>{children}</>;
		},
		DialogContent: ({
			children,
			"aria-busy": ariaBusy,
		}: {
			children: React.ReactNode;
			showCloseButton?: boolean;
			onCloseAutoFocus?: (e: Event) => void;
			"aria-busy"?: boolean;
			className?: string;
		}) => (
			<div data-testid="dialog-content" aria-busy={ariaBusy}>
				{children}
			</div>
		),
		DialogTitle: ({ children }: { children: React.ReactNode; className?: string }) => (
			<h2 data-testid="dialog-title">{children}</h2>
		),
		DialogDescription: ({
			children,
			className,
		}: {
			children: React.ReactNode;
			className?: string;
		}) => (
			<p data-testid="dialog-description" className={className}>
				{children}
			</p>
		),
	};
});

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		"aria-label": ariaLabel,
		variant,
		size,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		"aria-label"?: string;
		variant?: string;
		size?: string;
		className?: string;
	}) => (
		<button
			onClick={onClick}
			disabled={disabled}
			aria-label={ariaLabel}
			data-variant={variant}
			data-size={size}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		span: ({
			children,
			className,
		}: {
			children: React.ReactNode;
			className?: string;
			[key: string]: unknown;
		}) => <span className={className}>{children}</span>,
	},
	useReducedMotion: () => false,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { medium: 0.2 },
		easing: { easeOut: "easeOut" },
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	XIcon: () => <span data-testid="x-icon" />,
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
	useHaptic: vi.fn(() => vi.fn()),
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { QuickSearchDialog } from "../quick-search-dialog";
import type {
	QuickSearchCollection,
	QuickSearchProductType,
	RecentlyViewedProduct,
} from "../constants";

// ============================================================================
// FIXTURES
// ============================================================================

const mockCollections: QuickSearchCollection[] = [
	{ slug: "bagues", name: "Bagues", productCount: 10, image: null },
	{ slug: "colliers", name: "Colliers", productCount: 8, image: null },
];

const mockProductTypes: QuickSearchProductType[] = [
	{ slug: "bague", label: "Bagues" },
	{ slug: "collier", label: "Colliers" },
];

const mockRecentlyViewed: RecentlyViewedProduct[] = [
	{
		slug: "bague-lune",
		title: "Bague Lune",
		price: 4500,
		image: { url: "/img/bague.jpg", blurDataUrl: null },
	},
];

const defaultProps = {
	collections: mockCollections,
	productTypes: mockProductTypes,
	recentSearches: [],
	recentlyViewed: mockRecentlyViewed,
};

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
	// Reset state refs to defaults
	mockIsOpen.current = true;
	mockIsSearchMode.current = false;
	mockIsSearching.current = false;
	mockInputValue.current = "";
	mockSearchResults.current = null;
	mockSearchQuery.current = "";
	mockSearches.current = [];
	mockActiveDescendantId.current = undefined;
});

describe("QuickSearchDialog", () => {
	describe("dialog open/close", () => {
		it("renders the dialog when isOpen is true", () => {
			mockIsOpen.current = true;
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
		});

		it("does not render dialog content when isOpen is false", () => {
			mockIsOpen.current = false;
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();
		});

		it("calls close and reset when close button is clicked", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			const closeButtons = screen.getAllByRole("button", { name: "Fermer" });
			fireEvent.click(closeButtons[0]!);
			expect(mockClose).toHaveBeenCalledOnce();
			expect(mockReset).toHaveBeenCalledOnce();
		});

		it("calls close and reset when dialog overlay is closed", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			fireEvent.click(screen.getByTestId("dialog-overlay-close"));
			expect(mockClose).toHaveBeenCalledOnce();
			expect(mockReset).toHaveBeenCalledOnce();
		});
	});

	describe("accessibility", () => {
		it("renders the dialog title 'Rechercher'", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByTestId("dialog-title")).toHaveTextContent("Rechercher");
		});

		it("renders the dialog description for screen readers", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByTestId("dialog-description")).toBeInTheDocument();
		});

		it("exposes the results container as a listbox only in search mode (F3)", () => {
			// F3 (2026-05-29) préservé : aucun listbox en mode idle. Ce qui a changé,
			// c'est OÙ vit le rôle en mode recherche — sur un élément interne ne
			// contenant que des groupes d'options, plus sur `#qs-results` entier.
			//
			// Idle mode: neutral browse panel, no listbox role (avoids nesting
			// sections/lists/headings under an invalid listbox).
			mockIsSearchMode.current = false;
			const { rerender } = render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

			// Search mode: the container becomes a valid listbox of options.
			mockIsSearchMode.current = true;
			mockSearchResults.current = {
				kind: "success",
				products: [],
				totalCount: 0,
				suggestion: null,
			};
			rerender(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByRole("listbox", { name: "Résultats de recherche" })).toBeInTheDocument();
		});

		it("renders search role on the search input area", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByRole("search")).toBeInTheDocument();
		});

		// Régression P0 (audit 2026-05-20) : à l'ouverture (input vide + productTypes
		// présents), le placeholder vaut " " — le champ doit malgré tout exposer un
		// nom accessible explicite via `aria-label`, pas un placeholder vide.
		it("gives the search input a non-empty accessible name", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			const input = screen.getByTestId("search-input");
			expect(input.getAttribute("aria-label")?.trim()).toBeTruthy();
			expect(input).toHaveAccessibleName("Rechercher un bijou");
		});
	});

	describe("idle mode (no search query)", () => {
		beforeEach(() => {
			mockIsSearchMode.current = false;
			mockInputValue.current = "";
		});

		it("renders IdleContent in idle mode", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByTestId("idle-content")).toBeInTheDocument();
		});

		it("does not render QuickSearchContent in idle mode", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.queryByTestId("quick-search-content")).not.toBeInTheDocument();
		});

		it("renders QuickTagPills with product types when not in search mode", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByTestId("quick-tag-pills")).toBeInTheDocument();
		});

		it("does not show QuickTagPills when productTypes is empty", () => {
			render(<QuickSearchDialog {...defaultProps} productTypes={[]} />);
			expect(screen.queryByTestId("quick-tag-pills")).not.toBeInTheDocument();
		});

		it("passes searches from useRecentSearches to IdleContent", () => {
			mockSearches.current = ["bague", "collier"];
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByTestId("idle-content")).toHaveAttribute("data-searches", "2");
		});

		it("passes collections to IdleContent", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByTestId("idle-content")).toHaveAttribute("data-collections", "2");
		});

		it("shows screen reader announcement with searches count", () => {
			mockSearches.current = ["bague", "collier"];
			render(<QuickSearchDialog {...defaultProps} />);
			const status = screen.getByRole("status");
			expect(status.textContent).toContain("2 recherches récentes");
		});

		it("shows screen reader announcement with collections count", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			const status = screen.getByRole("status");
			expect(status.textContent).toContain("2 collections");
		});

		it("shows screen reader announcement with categories count", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			const status = screen.getByRole("status");
			expect(status.textContent).toContain("2 catégories");
		});
	});

	describe("search mode", () => {
		beforeEach(() => {
			mockIsSearchMode.current = true;
			mockInputValue.current = "bague argent";
			mockSearchQuery.current = "bague argent";
		});

		it("renders QuickSearchContent in search mode when results are available", () => {
			mockSearchResults.current = {
				kind: "success",
				products: [],
				totalCount: 0,
				suggestion: null,
			};
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByTestId("quick-search-content")).toBeInTheDocument();
		});

		it("passes the searchQuery to QuickSearchContent", () => {
			mockSearchResults.current = {
				kind: "success",
				products: [],
				totalCount: 0,
				suggestion: null,
			};
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByTestId("quick-search-content")).toHaveAttribute(
				"data-query",
				"bague argent",
			);
		});

		it("does not render IdleContent in search mode", () => {
			mockSearchResults.current = {
				kind: "success",
				products: [],
				totalCount: 0,
				suggestion: null,
			};
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.queryByTestId("idle-content")).not.toBeInTheDocument();
		});

		it("shows SearchResultsSkeleton when isSearching and no results yet", () => {
			mockIsSearching.current = true;
			mockSearchResults.current = null;
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByTestId("search-results-skeleton")).toBeInTheDocument();
		});

		it("shows error state when search results have an error type", () => {
			mockIsSearching.current = false;
			mockSearchResults.current = { type: "error" };
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByText(/temporairement indisponible/i)).toBeInTheDocument();
		});

		it("shows retry button in the error state", () => {
			mockIsSearching.current = false;
			mockSearchResults.current = { type: "error" };
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByRole("button", { name: /réessayer/i })).toBeInTheDocument();
		});

		it("calls handleLiveSearch with searchQuery when retry is clicked", () => {
			mockIsSearching.current = false;
			mockSearchResults.current = { type: "error" };
			mockSearchQuery.current = "bague";
			render(<QuickSearchDialog {...defaultProps} />);
			fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));
			expect(mockHandleLiveSearch).toHaveBeenCalledWith("bague");
		});

		it("does not show QuickTagPills when in search mode", () => {
			mockSearchResults.current = {
				kind: "success",
				products: [],
				totalCount: 0,
				suggestion: null,
			};
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.queryByTestId("quick-tag-pills")).not.toBeInTheDocument();
		});
	});

	describe("partial input hint", () => {
		it("shows hint when input has 1-2 characters (not search mode)", () => {
			mockIsSearchMode.current = false;
			mockInputValue.current = "ba";
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.getByText(/tape au moins 3 caractères/i)).toBeInTheDocument();
		});

		it("does not show hint when input is empty", () => {
			mockIsSearchMode.current = false;
			mockInputValue.current = "";
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.queryByText(/tape au moins 3 caractères/i)).not.toBeInTheDocument();
		});

		it("does not show hint when in search mode (3+ chars)", () => {
			mockIsSearchMode.current = true;
			mockInputValue.current = "bague";
			mockSearchResults.current = {
				kind: "success",
				products: [],
				totalCount: 0,
				suggestion: null,
			};
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.queryByText(/tape au moins 3 caractères/i)).not.toBeInTheDocument();
		});
	});

	describe("QuickTagPills interaction", () => {
		it("calls handleSearchFromSuggestion and resetActiveIndex when a tag is selected", () => {
			mockIsSearchMode.current = false;
			render(<QuickSearchDialog {...defaultProps} />);
			fireEvent.click(screen.getByTestId("tag-bague"));
			expect(mockResetActiveIndex).toHaveBeenCalled();
			expect(mockHandleSearchFromSuggestion).toHaveBeenCalledWith("Bagues");
		});
	});

	describe("handleSelectResult", () => {
		it("adds the search query to recent searches and closes dialog when a result is selected", () => {
			mockIsSearchMode.current = true;
			mockSearchQuery.current = "bague argent";
			mockSearchResults.current = {
				kind: "success",
				products: [],
				totalCount: 0,
				suggestion: null,
			};
			render(<QuickSearchDialog {...defaultProps} />);
			fireEvent.click(screen.getByTestId("content-select-result"));
			expect(mockAdd).toHaveBeenCalledWith("bague argent");
			expect(mockClose).toHaveBeenCalled();
		});
	});

	describe("handleViewAllResults", () => {
		it("navigates to search results page when 'view all results' is triggered", () => {
			mockIsSearchMode.current = true;
			mockSearchQuery.current = "collier or";
			mockSearchResults.current = {
				kind: "success",
				products: [],
				totalCount: 5,
				suggestion: null,
			};
			render(<QuickSearchDialog {...defaultProps} />);
			fireEvent.click(screen.getByTestId("content-view-all"));
			expect(mockRouterReplace).toHaveBeenCalledWith(
				expect.stringContaining("/produits?search=collier"),
			);
		});
	});

	describe("handleRecentSearch", () => {
		it("runs the search in-dialog (same behavior as suggestion pills) without saving to recent", () => {
			mockIsSearchMode.current = false;
			render(<QuickSearchDialog {...defaultProps} />);
			fireEvent.click(screen.getByTestId("idle-recent-search"));
			// Aligné sur les pills : le terme remplit le champ et la recherche
			// s'affiche DANS le dialog — plus de navigation directe vers la PLP.
			expect(mockResetActiveIndex).toHaveBeenCalled();
			expect(mockHandleSearchFromSuggestion).toHaveBeenCalledWith("bague");
			expect(mockRouterReplace).not.toHaveBeenCalled();
			// Pas de add() : le terme est déjà dans les récentes, le ré-ajouter le
			// ferait remonter en tête à chaque clic.
			expect(mockAdd).not.toHaveBeenCalled();
		});
	});

	describe("animated placeholder", () => {
		it("shows animated placeholder overlay when inputValue is empty and productTypes exist", () => {
			mockInputValue.current = "";
			render(<QuickSearchDialog {...defaultProps} />);
			// The animated placeholder renders "Rechercher :" text
			expect(screen.getByText("Rechercher :")).toBeInTheDocument();
		});

		it("hides animated placeholder when inputValue has content", () => {
			mockInputValue.current = "bague";
			render(<QuickSearchDialog {...defaultProps} />);
			expect(screen.queryByText("Rechercher :")).not.toBeInTheDocument();
		});

		it("hides animated placeholder when no productTypes are given", () => {
			mockInputValue.current = "";
			render(<QuickSearchDialog {...defaultProps} productTypes={[]} />);
			expect(screen.queryByText("Rechercher :")).not.toBeInTheDocument();
		});
	});

	describe("keyboard navigation wiring", () => {
		// Régression P1-A (audit 2026-05-20) : le handler de navigation clavier
		// doit être branché sur l'<input> (l'input garde le focus — pattern
		// combobox aria-activedescendant), pas sur le conteneur listbox frère.
		it("routes the search input's onKeyDown to the keyboard navigation handler", () => {
			render(<QuickSearchDialog {...defaultProps} />);
			fireEvent.keyDown(screen.getByTestId("search-input"), { key: "ArrowDown" });
			expect(mockHandleArrowNavigation).toHaveBeenCalled();
		});

		it("navigates to the full results page when Enter is pressed on the input", () => {
			mockIsSearchMode.current = true;
			mockInputValue.current = "bague";
			mockSearchQuery.current = "bague";
			mockSearchResults.current = {
				kind: "success",
				products: [],
				totalCount: 0,
				suggestion: null,
			};
			render(<QuickSearchDialog {...defaultProps} />);
			fireEvent.keyDown(screen.getByTestId("search-input"), { key: "Enter" });
			// `replace`, pas `push` : consomme l'entrée d'historique du dialog
			// (cf. close-reclaims-history.regression.test.tsx).
			expect(mockRouterReplace).toHaveBeenCalledWith(expect.stringContaining("/produits?search="));
		});
	});
});
