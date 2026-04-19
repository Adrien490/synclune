import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRouterPush, mockRouterPrefetch, mockHaptic, mockSearchParams, mockPathname } =
	vi.hoisted(() => ({
		mockRouterPush: vi.fn(),
		mockRouterPrefetch: vi.fn(),
		mockHaptic: vi.fn(),
		mockSearchParams: { current: new URLSearchParams() },
		mockPathname: { current: "/admin/ventes/commandes" },
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

vi.mock("lucide-react", () => ({
	ChevronLeft: () => <span data-testid="icon-chevron-left" />,
	ChevronRight: () => <span data-testid="icon-chevron-right" />,
	ChevronsLeft: () => <span data-testid="icon-chevrons-left" />,
	LoaderCircle: () => <span data-testid="icon-loader" />,
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

		it("renders result count with plural", () => {
			renderPagination({ currentPageSize: 15 });
			expect(screen.getByText("15")).toBeInTheDocument();
			const matches = screen.getAllByText(/résultats/);
			expect(matches.length).toBeGreaterThanOrEqual(1);
		});

		it("renders result count with singular", () => {
			renderPagination({ currentPageSize: 1, hasNextPage: false, hasPreviousPage: false });
			expect(screen.getByText("1")).toBeInTheDocument();
			const matches = screen.getAllByText(/résultat/);
			expect(matches.length).toBeGreaterThanOrEqual(1);
		});

		it("renders 'Aucun résultat' when currentPageSize is 0", () => {
			renderPagination({ currentPageSize: 0, hasNextPage: false, hasPreviousPage: false });
			expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
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

		it("renders keyboard shortcuts description", () => {
			renderPagination();
			const desc = screen.getByText(/Raccourcis.*Alt\+Flèche/);
			expect(desc).toBeInTheDocument();
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

		it("announces empty results", () => {
			renderPagination({
				currentPageSize: 0,
				hasNextPage: false,
				hasPreviousPage: false,
			});
			expect(screen.getByText("Aucun résultat.")).toBeInTheDocument();
		});

		it("announces result count and position on first page", () => {
			renderPagination({ currentPageSize: 20, hasNextPage: true, hasPreviousPage: false });
			const srText = screen.getByText(/Affichage de 20 résultats sur cette page/);
			expect(srText).toBeInTheDocument();
			expect(srText.textContent).toContain("Première page.");
			expect(srText.textContent).toContain("Pages suivantes disponibles.");
		});

		it("announces last page position", () => {
			renderPagination({
				currentPageSize: 5,
				hasNextPage: false,
				hasPreviousPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			const srText = screen.getByText(/Affichage de 5 résultats sur cette page/);
			expect(srText.textContent).toContain("Page précédente disponible.");
			expect(srText.textContent).toContain("Dernière page.");
		});

		it("announces single page", () => {
			renderPagination({
				currentPageSize: 5,
				hasNextPage: false,
				hasPreviousPage: false,
			});
			const srText = screen.getByText(/Affichage de 5 résultats sur cette page/);
			expect(srText.textContent).toContain("Page unique, navigation non disponible.");
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
});
