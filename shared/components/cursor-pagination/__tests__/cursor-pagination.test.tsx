import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRouterPush,
	mockRouterPrefetch,
	mockHaptic,
	mockSearchParams,
	mockPathname,
	mockHasFinePointer,
} = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockRouterPrefetch: vi.fn(),
	mockHaptic: vi.fn(),
	mockSearchParams: { current: new URLSearchParams() },
	mockPathname: { current: "/admin/ventes/commandes" },
	mockHasFinePointer: { current: true },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockRouterPush,
		prefetch: mockRouterPrefetch,
		replace: vi.fn(),
	}),
	usePathname: () => mockPathname.current,
	useSearchParams: () => mockSearchParams.current,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("@/shared/hooks/use-media-query", () => ({
	useMediaQuery: () => mockHasFinePointer.current,
}));

vi.mock("@/shared/components/ui/button-group", () => ({
	ButtonGroup: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="button-group">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange,
	}: {
		children: React.ReactNode;
		value: string;
		onValueChange: (v: string) => void;
	}) => (
		<div data-testid="select" data-value={value}>
			{children}
			<button data-testid="select-change" onClick={() => onValueChange("50")}>
				Change
			</button>
		</div>
	),
	SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<option value={value}>{children}</option>
	),
	SelectTrigger: ({
		children,
		id,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		id: string;
		"aria-label": string;
	}) => (
		<button id={id} aria-label={ariaLabel}>
			{children}
		</button>
	),
	SelectValue: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CaretLeftIcon: () => <span data-testid="icon-chevron-left" />,
	CaretRightIcon: () => <span data-testid="icon-chevron-right" />,
	CaretDoubleLeftIcon: () => <span data-testid="icon-chevrons-left" />,
	SpinnerIcon: () => <span data-testid="icon-loader" />,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { CursorPagination } from "../cursor-pagination";
import type { CursorPaginationProps } from "@/shared/types/component.types";

// ============================================================================
// HELPERS
// ============================================================================

const defaultProps: CursorPaginationProps = {
	perPage: 20,
	hasNextPage: true,
	hasPreviousPage: false,
	currentPageSize: 20,
	nextCursor: "cm1abc2def3ghi4jkl5mnop",
	prevCursor: null,
};

function renderPagination(overrides?: Partial<CursorPaginationProps>) {
	return render(<CursorPagination {...defaultProps} {...overrides} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("CursorPagination", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.current = new URLSearchParams();
		mockPathname.current = "/admin/ventes/commandes";
		// Defaults: simulate desktop (fine pointer) to keep existing tests stable.
		mockHasFinePointer.current = true;
	});

	afterEach(cleanup);

	// ========================================================================
	// RENDERING
	// ========================================================================

	describe("rendering", () => {
		it("renders the per-page select with current value", () => {
			renderPagination();
			const select = screen.getByTestId("select");
			expect(select).toHaveAttribute("data-value", "20");
		});

		it("reflects the server-resolved perPage prop when no ?perPage in URL", () => {
			// Régression : le select doit refléter la valeur réellement résolue
			// serveur (prop), pas un DEFAULT_PER_PAGE codé en dur. Ex. Clients=50.
			mockSearchParams.current = new URLSearchParams();
			renderPagination({ perPage: 50, currentPageSize: 50 });
			const select = screen.getByTestId("select");
			expect(select).toHaveAttribute("data-value", "50");
		});

		it("prioritizes ?perPage from URL over the prop", () => {
			mockSearchParams.current = new URLSearchParams("perPage=100");
			renderPagination({ perPage: 50, currentPageSize: 50 });
			const select = screen.getByTestId("select");
			expect(select).toHaveAttribute("data-value", "100");
		});

		it("renders result count with plural", () => {
			renderPagination({ currentPageSize: 15 });
			expect(screen.getByText("15")).toBeInTheDocument();
			const matches = screen.getAllByText(/résultats/);
			expect(matches.length).toBeGreaterThanOrEqual(1);
		});

		it("renders result count with singular", () => {
			// hasPreviousPage:true → multi-pages, donc la barre (compteur inclus) est rendue.
			renderPagination({ currentPageSize: 1, hasNextPage: false, hasPreviousPage: true });
			expect(screen.getByText("1")).toBeInTheDocument();
			const matches = screen.getAllByText(/résultat/);
			expect(matches.length).toBeGreaterThanOrEqual(1);
		});

		// ====================================================================
		// totalCount (P2-1)
		// ====================================================================

		it("renders 'X sur N' when totalCount is greater than currentPageSize", () => {
			// Use perPage=50 to avoid collision with default perPage=20 select value
			renderPagination({ perPage: 50, currentPageSize: 23, totalCount: 127 });
			expect(screen.getByText("23")).toBeInTheDocument();
			expect(screen.getByText("127")).toBeInTheDocument();
			// "sur" apparaît à la fois dans le span visible et dans le message aria-live
			expect(screen.getAllByText(/sur/).length).toBeGreaterThanOrEqual(2);
		});

		it("renders nothing when the dataset fits on one page (no next/prev)", () => {
			// Tient sur une page (totalCount === currentPageSize, ni next ni prev) →
			// barre entièrement masquée (décision UX), donc pas de compteur ni de « sur N ».
			const { container } = renderPagination({
				currentPageSize: 5,
				totalCount: 5,
				hasNextPage: false,
				hasPreviousPage: false,
			});
			expect(container).toBeEmptyDOMElement();
			expect(screen.queryByTestId("select")).not.toBeInTheDocument();
		});

		it("does NOT render 'sur N' when totalCount is undefined", () => {
			renderPagination({ currentPageSize: 15 });
			expect(screen.queryByText(/sur/)).not.toBeInTheDocument();
		});

		it("announces total in aria-live when totalCount provided", () => {
			renderPagination({ perPage: 50, currentPageSize: 23, totalCount: 127 });
			expect(screen.getByText("Page chargée, 23 sur 127 résultats.")).toBeInTheDocument();
		});

		it("uses plural 'résultats' based on totalCount when provided", () => {
			// hasPreviousPage:true → multi-pages, la barre est rendue.
			renderPagination({
				currentPageSize: 1,
				totalCount: 50,
				hasNextPage: false,
				hasPreviousPage: true,
			});
			// Plural based on totalCount=50, not currentPageSize=1
			const matches = screen.getAllByText(/résultats/);
			expect(matches.length).toBeGreaterThanOrEqual(1);
		});

		it("renders 'Par page' label", () => {
			renderPagination();
			expect(screen.getByText("Par page")).toBeInTheDocument();
		});

		it("renders per-page select with aria-label", () => {
			renderPagination();
			expect(screen.getByLabelText("Nombre de résultats par page")).toBeInTheDocument();
		});
	});

	// ========================================================================
	// CONDITIONAL NAVIGATION
	// ========================================================================

	describe("conditional navigation", () => {
		it("does NOT render nav when both hasNextPage and hasPreviousPage are false", () => {
			renderPagination({ hasNextPage: false, hasPreviousPage: false });
			expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
		});

		it("renders nav when hasNextPage is true", () => {
			renderPagination({ hasNextPage: true, hasPreviousPage: false });
			expect(screen.getByRole("navigation")).toBeInTheDocument();
		});

		it("renders nav when hasPreviousPage is true", () => {
			renderPagination({ hasNextPage: false, hasPreviousPage: true });
			expect(screen.getByRole("navigation")).toBeInTheDocument();
		});

		it("renders nav with aria-label 'Pagination'", () => {
			renderPagination();
			expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
		});

		it("renders keyboard shortcuts description when pointer is fine (desktop)", () => {
			mockHasFinePointer.current = true;
			renderPagination();
			const desc = screen.getByText(/Raccourcis.*Alt\+Flèche/);
			expect(desc).toBeInTheDocument();
		});

		// P1-3 : pas de bruit SR sur mobile (pointer coarse)
		it("does NOT render keyboard shortcuts description when pointer is coarse (mobile)", () => {
			mockHasFinePointer.current = false;
			renderPagination();
			expect(screen.queryByText(/Raccourcis.*Alt\+Flèche/)).not.toBeInTheDocument();
		});

		it("omits aria-describedby on nav when pointer is coarse (mobile)", () => {
			mockHasFinePointer.current = false;
			renderPagination();
			const nav = screen.getByRole("navigation");
			expect(nav).not.toHaveAttribute("aria-describedby");
		});
	});

	// ========================================================================
	// STATUS BADGE
	// ========================================================================

	describe("status badge", () => {
		it("shows 'Première page' on first page with next available", () => {
			renderPagination({ hasPreviousPage: false, hasNextPage: true });
			expect(screen.getByText("Première page")).toBeInTheDocument();
		});

		it("shows 'Dernière page' on last page with prev available", () => {
			renderPagination({
				hasPreviousPage: true,
				hasNextPage: false,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			expect(screen.getByText("Dernière page")).toBeInTheDocument();
		});

		it("shows 'Suite' when both directions available", () => {
			renderPagination({
				hasPreviousPage: true,
				hasNextPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			expect(screen.getByText("Suite")).toBeInTheDocument();
		});
	});

	// ========================================================================
	// DISABLED STATES
	// ========================================================================

	describe("disabled states", () => {
		it("disables 'Retour au début' on first page", () => {
			renderPagination();
			expect(screen.getByLabelText("Retour au début")).toBeDisabled();
		});

		it("enables 'Retour au début' when cursor is set", () => {
			mockSearchParams.current = new URLSearchParams({ cursor: "cm1abc2def3ghi4jkl5mnop" });
			renderPagination({ hasPreviousPage: true, prevCursor: "cm1abc2def3ghi4jkl5mnop" });
			expect(screen.getByLabelText("Retour au début")).not.toBeDisabled();
		});

		it("disables 'Page précédente' when hasPreviousPage is false", () => {
			renderPagination({ hasPreviousPage: false });
			expect(screen.getByLabelText("Page précédente")).toBeDisabled();
		});

		it("disables 'Page suivante' when hasNextPage is false", () => {
			renderPagination({
				hasNextPage: false,
				hasPreviousPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			expect(screen.getByLabelText("Page suivante")).toBeDisabled();
		});
	});

	// ========================================================================
	// LOADING STATE
	// ========================================================================

	describe("loading state", () => {
		it("shows chevrons-left icon when not pending", () => {
			renderPagination();
			expect(screen.getByTestId("icon-chevrons-left")).toBeInTheDocument();
			expect(screen.queryByTestId("icon-loader")).not.toBeInTheDocument();
		});
	});

	// ========================================================================
	// SEO LINKS
	// ========================================================================

	describe("SEO links", () => {
		it("renders rel='next' link when hasNextPage", () => {
			renderPagination({ hasNextPage: true });
			const nextLink = document.querySelector('link[rel="next"]');
			expect(nextLink).toBeInTheDocument();
			expect(nextLink?.getAttribute("href")).toContain("direction=forward");
		});

		it("does NOT render rel='next' when hasNextPage is false", () => {
			renderPagination({
				hasNextPage: false,
				hasPreviousPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			expect(document.querySelector('link[rel="next"]')).not.toBeInTheDocument();
		});

		it("renders rel='prev' link when hasPreviousPage", () => {
			renderPagination({
				hasPreviousPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			const prevLink = document.querySelector('link[rel="prev"]');
			expect(prevLink).toBeInTheDocument();
			expect(prevLink?.getAttribute("href")).toContain("direction=backward");
		});

		it("does NOT render rel='prev' when hasPreviousPage is false", () => {
			renderPagination({ hasPreviousPage: false });
			expect(document.querySelector('link[rel="prev"]')).not.toBeInTheDocument();
		});
	});

	// ========================================================================
	// ACCESSIBILITY
	// ========================================================================

	describe("accessibility", () => {
		it("renders aria-live polite status region", () => {
			renderPagination();
			const status = screen.getByRole("status", { name: "" });
			expect(status).toHaveAttribute("aria-live", "polite");
			expect(status).toHaveAttribute("aria-atomic", "true");
		});

		it("renders nothing when empty and single page", () => {
			// Liste vide tenant sur une page → barre entièrement masquée (le vide est
			// géré par l'état vide parent, ex. TableEmptyState).
			const { container } = renderPagination({
				currentPageSize: 0,
				hasNextPage: false,
				hasPreviousPage: false,
			});
			expect(container).toBeEmptyDOMElement();
		});

		it("announces result count and position on first page", () => {
			renderPagination({ currentPageSize: 20, hasNextPage: true, hasPreviousPage: false });
			expect(screen.getByText("Page chargée, 20 résultats.")).toBeInTheDocument();
			expect(screen.getByText("Première page")).toBeInTheDocument();
		});

		it("announces last page position", () => {
			renderPagination({
				currentPageSize: 5,
				hasNextPage: false,
				hasPreviousPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			expect(screen.getByText("Page chargée, 5 résultats.")).toBeInTheDocument();
			expect(screen.getByText("Dernière page")).toBeInTheDocument();
		});

		it("renders nothing on a single page", () => {
			// Page unique (ni next ni prev) → composant rend null (ni barre ni nav).
			const { container } = renderPagination({
				currentPageSize: 5,
				hasNextPage: false,
				hasPreviousPage: false,
			});
			expect(container).toBeEmptyDOMElement();
			expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
		});

		it("renders nav with aria-describedby pointing to shortcuts", () => {
			renderPagination();
			const nav = screen.getByRole("navigation");
			expect(nav).toHaveAttribute("aria-describedby", "pagination-shortcuts");
			expect(document.getElementById("pagination-shortcuts")).toBeInTheDocument();
		});

		it("renders page indicator with role='status'", () => {
			renderPagination();
			const indicators = screen.getAllByRole("status");
			const pageIndicator = indicators.find(
				(el) => el.getAttribute("aria-label") === "Position actuelle dans la pagination",
			);
			expect(pageIndicator).toBeInTheDocument();
		});
	});

	// ========================================================================
	// INTERACTIONS
	// ========================================================================

	describe("interactions", () => {
		it("navigates forward when clicking 'Page suivante'", async () => {
			const user = userEvent.setup();
			renderPagination();
			await user.click(screen.getByLabelText("Page suivante"));
			expect(mockRouterPush).toHaveBeenCalled();
			const url = mockRouterPush.mock.calls[0]?.[0] as string;
			expect(url).toContain("direction=forward");
			expect(url).toContain("cursor=cm1abc2def3ghi4jkl5mnop");
		});

		it("navigates backward when clicking 'Page précédente'", async () => {
			const user = userEvent.setup();
			renderPagination({
				hasPreviousPage: true,
				hasNextPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			await user.click(screen.getByLabelText("Page précédente"));
			expect(mockRouterPush).toHaveBeenCalled();
			const url = mockRouterPush.mock.calls[0]?.[0] as string;
			expect(url).toContain("direction=backward");
		});

		it("clears cursor when clicking 'Retour au début'", async () => {
			const user = userEvent.setup();
			mockSearchParams.current = new URLSearchParams({ cursor: "cm1abc2def3ghi4jkl5mnop" });
			renderPagination({
				hasPreviousPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			await user.click(screen.getByLabelText("Retour au début"));
			expect(mockRouterPush).toHaveBeenCalled();
			const url = mockRouterPush.mock.calls[0]?.[0] as string;
			expect(url).not.toContain("cursor=");
		});

		it("updates perPage on select change", async () => {
			const user = userEvent.setup();
			renderPagination();
			await user.click(screen.getByTestId("select-change"));
			expect(mockRouterPush).toHaveBeenCalled();
			const url = mockRouterPush.mock.calls[0]?.[0] as string;
			expect(url).toContain("perPage=50");
		});
	});

	// ========================================================================
	// HAPTIC FEEDBACK (native mobile 2026)
	// ========================================================================

	describe("haptic feedback", () => {
		it("triggers light haptic on next page click", async () => {
			const user = userEvent.setup();
			renderPagination();
			await user.click(screen.getByLabelText("Page suivante"));
			expect(mockHaptic).toHaveBeenCalledWith("light");
		});

		it("triggers light haptic on previous page click", async () => {
			const user = userEvent.setup();
			renderPagination({
				hasPreviousPage: true,
				hasNextPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			await user.click(screen.getByLabelText("Page précédente"));
			expect(mockHaptic).toHaveBeenCalledWith("light");
		});

		it("triggers selection haptic on 'Retour au début' click", async () => {
			const user = userEvent.setup();
			mockSearchParams.current = new URLSearchParams({ cursor: "cm1abc2def3ghi4jkl5mnop" });
			renderPagination({
				hasPreviousPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			await user.click(screen.getByLabelText("Retour au début"));
			expect(mockHaptic).toHaveBeenCalledWith("selection");
		});

		it("triggers selection haptic on per-page change", async () => {
			const user = userEvent.setup();
			renderPagination();
			await user.click(screen.getByTestId("select-change"));
			expect(mockHaptic).toHaveBeenCalledWith("selection");
		});
	});

	// ========================================================================
	// TOUCH TARGETS (WCAG 2.5.5)
	// ========================================================================

	describe("touch targets", () => {
		it("applies h-11 mobile / sm:h-9 desktop to per-page select trigger", () => {
			renderPagination();
			const trigger = screen.getByLabelText("Nombre de résultats par page");
			expect(trigger).toBeInTheDocument();
		});
	});

	// ========================================================================
	// SCROLL / FOCUS AU CHANGEMENT DE CURSEUR
	// ========================================================================

	/**
	 * @regression cursor-pagination-mount-scroll-2026-07-26
	 *
	 * Le scroll-to-top ne doit se déclencher QUE sur un vrai changement de
	 * curseur. Une sentinelle initiale différente de toute valeur de curseur le
	 * déclenchait à chaque montage : au retour navigateur depuis une page de
	 * détail, Next.js restaurait la position de scroll puis le composant la
	 * renvoyait immédiatement en haut (et volait le focus via `focusTargetRef`).
	 */
	describe("scroll au changement de curseur", () => {
		let scrollSpy: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			scrollSpy = vi.fn();
			vi.stubGlobal("scrollTo", scrollSpy);
			// `onCursorChange` lit prefers-reduced-motion avant de scroller.
			vi.stubGlobal(
				"matchMedia",
				vi.fn(() => ({
					matches: false,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
				})),
			);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("ne scrolle pas au montage sur la première page (pas de ?cursor)", () => {
			renderPagination();
			expect(scrollSpy).not.toHaveBeenCalled();
		});

		it("ne scrolle pas au montage sur une page profonde (retour navigateur)", () => {
			mockSearchParams.current = new URLSearchParams({ cursor: "cm1abc2def3ghi4jkl5mnop" });
			renderPagination({ hasPreviousPage: true, prevCursor: "cm1zzz9yyy8xxx7www6vut" });
			expect(scrollSpy).not.toHaveBeenCalled();
		});

		it("ne vole pas le focus au montage", () => {
			const focusSpy = vi.fn();
			const focusTargetRef = {
				current: { focus: focusSpy } as unknown as HTMLElement,
			};
			mockSearchParams.current = new URLSearchParams({ cursor: "cm1abc2def3ghi4jkl5mnop" });
			renderPagination({ hasPreviousPage: true, focusTargetRef });
			expect(focusSpy).not.toHaveBeenCalled();
		});

		it("scrolle en haut quand le curseur change après le montage", () => {
			const { rerender } = renderPagination();
			expect(scrollSpy).not.toHaveBeenCalled();

			mockSearchParams.current = new URLSearchParams({ cursor: "cm1abc2def3ghi4jkl5mnop" });
			rerender(<CursorPagination {...defaultProps} hasPreviousPage />);

			expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
		});
	});
});
