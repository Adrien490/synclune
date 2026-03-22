import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockHandleNext,
	mockHandlePrevious,
	mockHandleReset,
	mockHandlePerPageChange,
	mockHookReturn,
} = vi.hoisted(() => {
	const handleNext = vi.fn();
	const handlePrevious = vi.fn();
	const handleReset = vi.fn();
	const handlePerPageChange = vi.fn();
	return {
		mockHandleNext: handleNext,
		mockHandlePrevious: handlePrevious,
		mockHandleReset: handleReset,
		mockHandlePerPageChange: handlePerPageChange,
		mockHookReturn: {
			cursor: undefined as string | undefined,
			pathname: "/admin/ventes/commandes",
			searchParams: new URLSearchParams(),
			isPending: false,
			handleNext,
			handlePrevious,
			handleReset,
			handlePerPageChange,
			perPage: 20,
		},
	};
});

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/hooks/use-cursor-pagination", () => ({
	useCursorPagination: vi.fn(() => mockHookReturn),
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
	Loader2: () => <span data-testid="icon-loader" />,
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
		mockHookReturn.cursor = undefined;
		mockHookReturn.isPending = false;
		mockHookReturn.searchParams = new URLSearchParams();
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
			// Visible "résultats" text (also present in sr-only region)
			const matches = screen.getAllByText(/résultats/);
			expect(matches.length).toBeGreaterThanOrEqual(1);
		});

		it("renders result count with singular", () => {
			renderPagination({ currentPageSize: 1, hasNextPage: false, hasPreviousPage: false });
			expect(screen.getByText("1")).toBeInTheDocument();
			// " résultat" without "s" in visible span + "résultat" in sr-only region
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
			mockHookReturn.cursor = undefined;
			renderPagination();
			expect(screen.getByLabelText("Retour au début")).toBeDisabled();
		});

		it("enables 'Retour au début' when cursor is set", () => {
			mockHookReturn.cursor = "cm1abc2def3ghi4jkl5mnop";
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

		it("disables all buttons when isPending", () => {
			mockHookReturn.isPending = true;
			mockHookReturn.cursor = "cm1abc2def3ghi4jkl5mnop";
			renderPagination({
				hasPreviousPage: true,
				hasNextPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			expect(screen.getByLabelText("Retour au début")).toBeDisabled();
			expect(screen.getByLabelText("Page précédente")).toBeDisabled();
			expect(screen.getByLabelText("Page suivante")).toBeDisabled();
		});
	});

	// ========================================================================
	// LOADING STATE
	// ========================================================================

	describe("loading state", () => {
		it("shows loader icon when isPending and not first page", () => {
			mockHookReturn.isPending = true;
			mockHookReturn.cursor = "cm1abc2def3ghi4jkl5mnop";
			renderPagination({
				hasPreviousPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
		});

		it("shows chevrons-left icon when not pending", () => {
			mockHookReturn.isPending = false;
			renderPagination();
			expect(screen.getByTestId("icon-chevrons-left")).toBeInTheDocument();
			expect(screen.queryByTestId("icon-loader")).not.toBeInTheDocument();
		});

		it("applies pointer-events-none class when isPending", () => {
			mockHookReturn.isPending = true;
			const { container } = renderPagination();
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).toContain("pointer-events-none");
			expect(wrapper.className).toContain("opacity-80");
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

		it("announces loading state", () => {
			mockHookReturn.isPending = true;
			renderPagination();
			expect(screen.getByText("Chargement des résultats...")).toBeInTheDocument();
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
		it("calls handleNext when clicking 'Page suivante'", async () => {
			const user = userEvent.setup();
			renderPagination();
			await user.click(screen.getByLabelText("Page suivante"));
			expect(mockHandleNext).toHaveBeenCalledOnce();
		});

		it("calls handlePrevious when clicking 'Page précédente'", async () => {
			const user = userEvent.setup();
			renderPagination({
				hasPreviousPage: true,
				hasNextPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			await user.click(screen.getByLabelText("Page précédente"));
			expect(mockHandlePrevious).toHaveBeenCalledOnce();
		});

		it("calls handleReset when clicking 'Retour au début'", async () => {
			const user = userEvent.setup();
			mockHookReturn.cursor = "cm1abc2def3ghi4jkl5mnop";
			renderPagination({
				hasPreviousPage: true,
				prevCursor: "cm1abc2def3ghi4jkl5mnop",
			});
			await user.click(screen.getByLabelText("Retour au début"));
			expect(mockHandleReset).toHaveBeenCalledOnce();
		});

		it("calls handlePerPageChange when changing select", async () => {
			const user = userEvent.setup();
			renderPagination();
			await user.click(screen.getByTestId("select-change"));
			expect(mockHandlePerPageChange).toHaveBeenCalledWith(50);
		});
	});
});
