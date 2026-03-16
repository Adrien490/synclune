import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({ children, open }: any) =>
		open !== false ? <div data-testid="sheet">{children}</div> : null,
	SheetTrigger: ({ children }: any) => <div data-testid="sheet-trigger">{children}</div>,
	SheetContent: ({ children, onKeyDown, ...props }: any) => (
		<div data-testid="sheet-content" onKeyDown={onKeyDown} {...props}>
			{children}
		</div>
	),
	SheetHeader: ({ children, ...props }: any) => (
		<div data-testid="sheet-header" {...props}>
			{children}
		</div>
	),
	SheetFooter: ({ children, ...props }: any) => (
		<div data-testid="sheet-footer" {...props}>
			{children}
		</div>
	),
	SheetClose: ({ children }: any) => <>{children}</>,
	SheetDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, ...props }: any) => (
		<span data-testid="badge" {...props}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, disabled, "aria-label": ariaLabel, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/button-group", () => ({
	ButtonGroup: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock("@/shared/components/ui/scroll-area", () => ({
	ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Filter: () => <span data-testid="filter-icon" />,
	Loader2: () => <span data-testid="loader-icon" />,
	X: () => <span data-testid="x-icon" />,
}));

// ============================================================================
// Import under test (after mocks)
// ============================================================================

import { FilterSheetWrapper } from "../filter-sheet-wrapper";

// ============================================================================
// Tests
// ============================================================================

describe("FilterSheetWrapper", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// ============================================================================
	// Rendering
	// ============================================================================

	describe("rendering", () => {
		it("renders the sheet title with default value", () => {
			render(<FilterSheetWrapper>content</FilterSheetWrapper>);

			expect(screen.getByRole("heading", { name: "Filtres" })).toBeInTheDocument();
		});

		it("renders a custom title when provided", () => {
			render(<FilterSheetWrapper title="Mes filtres">content</FilterSheetWrapper>);

			expect(screen.getByRole("heading", { name: "Mes filtres" })).toBeInTheDocument();
		});

		it("renders description when provided", () => {
			render(
				<FilterSheetWrapper description="Affinez votre recherche">content</FilterSheetWrapper>,
			);

			expect(screen.getByText("Affinez votre recherche")).toBeInTheDocument();
		});

		it("does not render description when not provided", () => {
			render(<FilterSheetWrapper>content</FilterSheetWrapper>);

			// SheetDescription is only rendered when description prop is passed
			expect(screen.queryByText(/affinez/i)).not.toBeInTheDocument();
		});

		it("renders children content inside the scroll area", () => {
			render(
				<FilterSheetWrapper>
					<span data-testid="child-content">filter content</span>
				</FilterSheetWrapper>,
			);

			expect(screen.getByTestId("child-content")).toBeInTheDocument();
		});

		it("renders custom apply button text when provided", () => {
			render(<FilterSheetWrapper applyButtonText="Rechercher">content</FilterSheetWrapper>);

			const applyButtons = screen.getAllByText("Rechercher");
			expect(applyButtons.length).toBeGreaterThan(0);
		});

		it("renders custom cancel button text when provided", () => {
			render(<FilterSheetWrapper cancelButtonText="Retour">content</FilterSheetWrapper>);

			expect(screen.getByText("Retour")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// Trigger
	// ============================================================================

	describe("trigger", () => {
		it("shows the default trigger with filter icon by default", () => {
			render(<FilterSheetWrapper>content</FilterSheetWrapper>);

			expect(screen.getByTestId("sheet-trigger")).toBeInTheDocument();
			expect(screen.getByTestId("filter-icon")).toBeInTheDocument();
		});

		it("shows badge when activeFiltersCount is greater than 0", () => {
			render(<FilterSheetWrapper activeFiltersCount={3}>content</FilterSheetWrapper>);

			expect(screen.getByTestId("badge")).toBeInTheDocument();
			expect(screen.getByTestId("badge")).toHaveTextContent("3");
		});

		it("does not show badge when activeFiltersCount is 0", () => {
			render(<FilterSheetWrapper activeFiltersCount={0}>content</FilterSheetWrapper>);

			expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
		});

		it("hides trigger entirely when hideTrigger is true", () => {
			render(<FilterSheetWrapper hideTrigger>content</FilterSheetWrapper>);

			expect(screen.queryByTestId("sheet-trigger")).not.toBeInTheDocument();
		});

		it("renders custom trigger when provided", () => {
			render(
				<FilterSheetWrapper trigger={<button data-testid="custom-trigger">Ouvrir</button>}>
					content
				</FilterSheetWrapper>,
			);

			expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
			expect(screen.queryByTestId("filter-icon")).not.toBeInTheDocument();
		});

		it("sets aria-label to 'Filtres' when no active filters", () => {
			render(<FilterSheetWrapper activeFiltersCount={0}>content</FilterSheetWrapper>);

			expect(screen.getByRole("button", { name: "Filtres" })).toBeInTheDocument();
		});

		it("sets aria-label with count for singular active filter", () => {
			render(<FilterSheetWrapper activeFiltersCount={1}>content</FilterSheetWrapper>);

			expect(screen.getByRole("button", { name: "Filtres - 1 actif" })).toBeInTheDocument();
		});

		it("sets aria-label with plural for multiple active filters", () => {
			render(<FilterSheetWrapper activeFiltersCount={3}>content</FilterSheetWrapper>);

			expect(screen.getByRole("button", { name: "Filtres - 3 actifs" })).toBeInTheDocument();
		});

		it("renders sr-only live text for screen readers when filters are active", () => {
			render(<FilterSheetWrapper activeFiltersCount={2}>content</FilterSheetWrapper>);

			const srText = screen.getByText(/2 filtres? actifs?/);
			expect(srText).toBeInTheDocument();
		});
	});

	// ============================================================================
	// Clear all button
	// ============================================================================

	describe("clear all button", () => {
		it("shows 'Tout effacer' button when hasActiveFilters and onClearAll are provided", () => {
			const onClearAll = vi.fn();
			render(
				<FilterSheetWrapper hasActiveFilters onClearAll={onClearAll}>
					content
				</FilterSheetWrapper>,
			);

			expect(screen.getByRole("button", { name: "Effacer tous les filtres" })).toBeInTheDocument();
		});

		it("calls onClearAll when 'Tout effacer' button is clicked", () => {
			const onClearAll = vi.fn();
			render(
				<FilterSheetWrapper hasActiveFilters onClearAll={onClearAll}>
					content
				</FilterSheetWrapper>,
			);

			fireEvent.click(screen.getByRole("button", { name: "Effacer tous les filtres" }));
			expect(onClearAll).toHaveBeenCalledTimes(1);
		});

		it("does not show clear button when hasActiveFilters is false", () => {
			const onClearAll = vi.fn();
			render(
				<FilterSheetWrapper hasActiveFilters={false} onClearAll={onClearAll}>
					content
				</FilterSheetWrapper>,
			);

			expect(
				screen.queryByRole("button", { name: "Effacer tous les filtres" }),
			).not.toBeInTheDocument();
		});

		it("does not show clear button when onClearAll is not provided", () => {
			render(<FilterSheetWrapper hasActiveFilters>content</FilterSheetWrapper>);

			expect(
				screen.queryByRole("button", { name: "Effacer tous les filtres" }),
			).not.toBeInTheDocument();
		});
	});

	// ============================================================================
	// Cmd+Enter / Ctrl+Enter shortcut
	// ============================================================================

	describe("keyboard shortcut", () => {
		it("calls onApply and onOpenChange(false) when Cmd+Enter is pressed", () => {
			const onApply = vi.fn();
			const onOpenChange = vi.fn();
			render(
				<FilterSheetWrapper onApply={onApply} onOpenChange={onOpenChange}>
					content
				</FilterSheetWrapper>,
			);

			const content = screen.getByTestId("sheet-content");
			fireEvent.keyDown(content, { key: "Enter", metaKey: true });

			expect(onApply).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("calls onApply and onOpenChange(false) when Ctrl+Enter is pressed", () => {
			const onApply = vi.fn();
			const onOpenChange = vi.fn();
			render(
				<FilterSheetWrapper onApply={onApply} onOpenChange={onOpenChange}>
					content
				</FilterSheetWrapper>,
			);

			const content = screen.getByTestId("sheet-content");
			fireEvent.keyDown(content, { key: "Enter", ctrlKey: true });

			expect(onApply).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("does NOT trigger when plain Enter is pressed (no meta/ctrl)", () => {
			const onApply = vi.fn();
			render(<FilterSheetWrapper onApply={onApply}>content</FilterSheetWrapper>);

			const content = screen.getByTestId("sheet-content");
			fireEvent.keyDown(content, { key: "Enter" });

			expect(onApply).not.toHaveBeenCalled();
		});

		it("does NOT trigger when Cmd+other key is pressed", () => {
			const onApply = vi.fn();
			render(<FilterSheetWrapper onApply={onApply}>content</FilterSheetWrapper>);

			const content = screen.getByTestId("sheet-content");
			fireEvent.keyDown(content, { key: "k", metaKey: true });

			expect(onApply).not.toHaveBeenCalled();
		});
	});

	// ============================================================================
	// Apply button
	// ============================================================================

	describe("apply button", () => {
		it("clicking the mobile apply button calls onApply and onOpenChange(false)", () => {
			const onApply = vi.fn();
			const onOpenChange = vi.fn();
			render(
				<FilterSheetWrapper onApply={onApply} onOpenChange={onOpenChange}>
					content
				</FilterSheetWrapper>,
			);

			const applyButtons = screen.getAllByText("Appliquer");
			fireEvent.click(applyButtons[0]!.closest("button")!);

			expect(onApply).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("apply buttons are disabled when isPending is true", () => {
			render(<FilterSheetWrapper isPending>content</FilterSheetWrapper>);

			const applyButtons = screen
				.getAllByText("Appliquer")
				.map((el) => el.closest("button"))
				.filter(Boolean) as HTMLButtonElement[];

			expect(applyButtons.length).toBeGreaterThan(0);
			applyButtons.forEach((btn) => {
				expect(btn).toBeDisabled();
			});
		});

		it("renders a single full-width apply button when showCancelButton is false", () => {
			const onApply = vi.fn();
			render(
				<FilterSheetWrapper showCancelButton={false} onApply={onApply}>
					content
				</FilterSheetWrapper>,
			);

			// Only one button with the apply text (no ButtonGroup / cancel sibling)
			const applyButtons = screen.getAllByText("Appliquer");
			expect(applyButtons).toHaveLength(1);
		});
	});

	// ============================================================================
	// Pending state
	// ============================================================================

	describe("pending state", () => {
		it("shows progress bar when isPending is true", () => {
			render(<FilterSheetWrapper isPending>content</FilterSheetWrapper>);

			expect(screen.getByRole("progressbar")).toBeInTheDocument();
		});

		it("does not show progress bar when isPending is false", () => {
			render(<FilterSheetWrapper isPending={false}>content</FilterSheetWrapper>);

			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});

		it("sets aria-busy=true on content region when isPending", () => {
			render(<FilterSheetWrapper isPending>content</FilterSheetWrapper>);

			const region = screen.getByRole("region", { name: "Options de filtrage" });
			expect(region).toHaveAttribute("aria-busy", "true");
		});

		it("sets aria-busy=false on content region when not pending", () => {
			render(<FilterSheetWrapper isPending={false}>content</FilterSheetWrapper>);

			const region = screen.getByRole("region", { name: "Options de filtrage" });
			expect(region).toHaveAttribute("aria-busy", "false");
		});

		it("live region announces pending state when isPending is true", () => {
			render(<FilterSheetWrapper isPending>content</FilterSheetWrapper>);

			const liveRegion = screen.getByRole("status");
			expect(liveRegion).toHaveTextContent("Mise à jour des filtres en cours...");
		});

		it("live region is empty when not pending", () => {
			render(<FilterSheetWrapper isPending={false}>content</FilterSheetWrapper>);

			const liveRegion = screen.getByRole("status");
			expect(liveRegion).toHaveTextContent("");
		});

		it("shows loader icon inside apply button when isPending", () => {
			render(<FilterSheetWrapper isPending>content</FilterSheetWrapper>);

			expect(screen.getAllByTestId("loader-icon").length).toBeGreaterThan(0);
		});
	});

	// ============================================================================
	// Accessibility
	// ============================================================================

	describe("accessibility", () => {
		it("content region has aria-label 'Options de filtrage'", () => {
			render(<FilterSheetWrapper>content</FilterSheetWrapper>);

			expect(screen.getByRole("region", { name: "Options de filtrage" })).toBeInTheDocument();
		});

		it("live region has role=status and aria-live=polite", () => {
			render(<FilterSheetWrapper>content</FilterSheetWrapper>);

			const liveRegion = screen.getByRole("status");
			expect(liveRegion).toHaveAttribute("aria-live", "polite");
		});

		it("progress bar has descriptive aria-label when visible", () => {
			render(<FilterSheetWrapper isPending>content</FilterSheetWrapper>);

			expect(screen.getByRole("progressbar")).toHaveAttribute(
				"aria-label",
				"Chargement des filtres",
			);
		});

		it("close button has aria-label 'Fermer'", () => {
			render(<FilterSheetWrapper>content</FilterSheetWrapper>);

			expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
		});
	});

	// ============================================================================
	// Controlled mode
	// ============================================================================

	describe("controlled mode", () => {
		it("passes controlled open state to Sheet", () => {
			render(
				<FilterSheetWrapper open={true} onOpenChange={vi.fn()}>
					content
				</FilterSheetWrapper>,
			);

			expect(screen.getByTestId("sheet")).toBeInTheDocument();
		});

		it("Sheet is not rendered when controlled open is false", () => {
			render(
				<FilterSheetWrapper open={false} onOpenChange={vi.fn()}>
					content
				</FilterSheetWrapper>,
			);

			expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
		});
	});
});
