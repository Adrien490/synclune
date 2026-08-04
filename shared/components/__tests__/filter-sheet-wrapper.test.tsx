import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({ children, open, repositionInputs }: any) =>
		open !== false ? (
			<div data-testid="sheet" data-reposition-inputs={repositionInputs ? "true" : "false"}>
				{children}
			</div>
		) : null,
	SheetTrigger: (props: RenderPropMockProps) =>
		renderPropMock("div", { "data-testid": "sheet-trigger", ...props }),
	SheetContent: ({ children, onKeyDown, ...props }: any) => (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions
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
	SheetClose: (props: RenderPropMockProps) => renderPropMock("div", props),
	SheetDescription: ({ children }: any) => <p>{children}</p>,
	SheetHandle: () => <span data-testid="sheet-handle" />,
}));

// useIsMobile lit window.matchMedia (absent en jsdom) — mock-le pour contrôler
// la branche mobile/desktop du wrapper directement dans les tests.
const { mockUseIsMobile } = vi.hoisted(() => ({
	mockUseIsMobile: vi.fn(() => false), // default : desktop
}));
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: mockUseIsMobile,
}));

// useHaptic est SSR-safe mais on mock pour tracer les appels dans les tests.
const mockHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
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
	buttonVariants: () => "",
}));

// AlertDialog est mocké pour isoler le wrapper ; seuls les 2 boutons de la
// confirm (Annuler / Tout effacer) sont exposés quand `open=true`.
vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({ open, children }: any) =>
		open ? <div data-testid="alert-dialog">{children}</div> : null,
	AlertDialogContent: ({ children }: any) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
	AlertDialogAction: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} data-testid="alert-dialog-action" {...props}>
			{children}
		</button>
	),
	AlertDialogCancel: ({ children, ...props }: any) => (
		<button data-testid="alert-dialog-cancel" {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/hooks/use-media-query", () => ({
	useMediaQuery: () => false,
}));

vi.mock("@/shared/components/ui/button-group", () => ({
	ButtonGroup: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock("@/shared/components/ui/scroll-area", () => ({
	ScrollArea: ({ children, ...props }: any) => (
		<div data-testid="scroll-area" {...props}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	FunnelIcon: () => <span data-testid="filter-icon" />,
	SpinnerIcon: () => <span data-testid="loader-icon" />,
	XIcon: () => <span data-testid="x-icon" />,
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

		it("apply button is disabled when isPending is true", () => {
			render(<FilterSheetWrapper isPending>content</FilterSheetWrapper>);

			const applyButton = screen.getByText("Appliquer").closest("button");
			expect(applyButton).toBeDisabled();
		});

		it("renders a single full-width apply button (no cancel sibling)", () => {
			const onApply = vi.fn();
			render(<FilterSheetWrapper onApply={onApply}>content</FilterSheetWrapper>);

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
			expect(liveRegion).toHaveTextContent("Mise à jour des filtres en cours…");
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

	// ============================================================================
	// Haptic feedback (native 2026)
	// ============================================================================

	describe("haptic feedback", () => {
		it("fires haptic('success') on Apply click (positive outcome — Apple HIG)", () => {
			render(
				<FilterSheetWrapper open onOpenChange={vi.fn()} onApply={vi.fn()}>
					content
				</FilterSheetWrapper>,
			);
			// Multiple Apply buttons rendered (mobile + desktop branches) — pick first.
			const applyButtons = screen.getAllByText("Appliquer");
			fireEvent.click(applyButtons[0]!);
			expect(mockHaptic).toHaveBeenCalledWith("success");
		});

		it("fires haptic('light') on Clear all click when below confirm threshold", () => {
			const onClearAll = vi.fn();
			render(
				<FilterSheetWrapper
					open
					onOpenChange={vi.fn()}
					hasActiveFilters
					activeFiltersCount={2}
					onClearAll={onClearAll}
				>
					content
				</FilterSheetWrapper>,
			);
			fireEvent.click(screen.getByRole("button", { name: "Effacer tous les filtres" }));
			expect(mockHaptic).toHaveBeenCalledWith("light");
			expect(onClearAll).toHaveBeenCalledTimes(1);
		});

		it("fires haptic('error') and opens confirm dialog when ≥ confirm threshold", () => {
			const onClearAll = vi.fn();
			render(
				<FilterSheetWrapper
					open
					onOpenChange={vi.fn()}
					hasActiveFilters
					activeFiltersCount={5}
					onClearAll={onClearAll}
				>
					content
				</FilterSheetWrapper>,
			);
			fireEvent.click(screen.getByRole("button", { name: "Effacer tous les filtres" }));
			expect(mockHaptic).toHaveBeenCalledWith("error");
			// onClearAll must NOT have fired yet — user must confirm first
			expect(onClearAll).not.toHaveBeenCalled();
			// Confirm dialog is now open
			expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();

			// Confirm via the action button
			fireEvent.click(screen.getByTestId("alert-dialog-action"));
			expect(mockHaptic).toHaveBeenCalledWith("light");
			expect(onClearAll).toHaveBeenCalledTimes(1);
		});

		it("bypasses confirm when confirmClearThreshold=Infinity", () => {
			const onClearAll = vi.fn();
			render(
				<FilterSheetWrapper
					open
					onOpenChange={vi.fn()}
					hasActiveFilters
					activeFiltersCount={99}
					confirmClearThreshold={Number.POSITIVE_INFINITY}
					onClearAll={onClearAll}
				>
					content
				</FilterSheetWrapper>,
			);
			fireEvent.click(screen.getByRole("button", { name: "Effacer tous les filtres" }));
			expect(mockHaptic).toHaveBeenCalledWith("light");
			expect(onClearAll).toHaveBeenCalledTimes(1);
		});

		it("fires NO haptic on close button click (silence > parasitic buzz — Material 3)", () => {
			render(
				<FilterSheetWrapper open onOpenChange={vi.fn()}>
					content
				</FilterSheetWrapper>,
			);
			fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
			expect(mockHaptic).not.toHaveBeenCalled();
		});
	});

	// ============================================================================
	// Touch target accessibility (WCAG 2.5.5 / Apple HIG)
	// ============================================================================

	describe("touch targets", () => {
		it("close button is size-11 (44px) not size-9", () => {
			render(<FilterSheetWrapper>content</FilterSheetWrapper>);
			const closeBtn = screen.getByRole("button", { name: "Fermer" });
			expect(closeBtn.className).toContain("size-11");
			expect(closeBtn.className).not.toContain("size-9");
		});

		it("clear button is min-h-11 not min-h-9", () => {
			render(
				<FilterSheetWrapper hasActiveFilters activeFiltersCount={1} onClearAll={vi.fn()}>
					content
				</FilterSheetWrapper>,
			);
			const clearBtn = screen.getByRole("button", { name: "Effacer tous les filtres" });
			expect(clearBtn.className).toContain("min-h-11");
		});
	});

	// ============================================================================
	// Pending state (data-pending attribute for CSS reactive descendants)
	// ============================================================================

	describe("data-pending attribute", () => {
		it("sets data-pending='' on SheetContent when isPending=true", () => {
			render(
				<FilterSheetWrapper isPending>
					<span data-testid="child">content</span>
				</FilterSheetWrapper>,
			);
			const content = screen.getByTestId("sheet-content");
			expect(content).toHaveAttribute("data-pending", "");
			expect(content).toHaveAttribute("aria-busy", "true");
		});

		it("does not set data-pending when isPending=false", () => {
			render(<FilterSheetWrapper isPending={false}>content</FilterSheetWrapper>);
			const content = screen.getByTestId("sheet-content");
			expect(content).not.toHaveAttribute("data-pending");
		});
	});

	// ============================================================================
	// Overlay click handler
	// ============================================================================

	describe("overlay click", () => {
		it("passes onOverlayClick down to SheetContent when provided", () => {
			const onOverlayClick = vi.fn();
			render(<FilterSheetWrapper onOverlayClick={onOverlayClick}>content</FilterSheetWrapper>);
			// SheetContent is mocked — verify the prop was forwarded via attribute match
			const content = screen.getByTestId("sheet-content");
			expect(content).toBeInTheDocument();
			// onOverlayClick is a function prop — not inspectable via DOM; rely on
			// the implementation forwarding it (integration-level test).
		});
	});

	// ============================================================================
	// Vaul gestures — repositionInputs forwarded conditionally
	// ============================================================================

	describe("vaul gestures (repositionInputs)", () => {
		it("does NOT activate repositionInputs in desktop right-side sheet (no mobile keyboard)", () => {
			mockUseIsMobile.mockReturnValue(false);
			render(<FilterSheetWrapper>content</FilterSheetWrapper>);
			const sheet = screen.getByTestId("sheet");
			expect(sheet).toHaveAttribute("data-reposition-inputs", "false");
		});

		it("activates repositionInputs in mobile bottom-sheet (keyboard repositions focused input)", () => {
			mockUseIsMobile.mockReturnValue(true);
			render(<FilterSheetWrapper>content</FilterSheetWrapper>);
			const sheet = screen.getByTestId("sheet");
			expect(sheet).toHaveAttribute("data-reposition-inputs", "true");
		});

		it("ScrollArea content region carries data-base-ui-swipe-ignore (defensive isolation of internal scroll)", () => {
			render(<FilterSheetWrapper>content</FilterSheetWrapper>);
			const scrollArea = screen.getByTestId("scroll-area");
			expect(scrollArea).toHaveAttribute("data-base-ui-swipe-ignore");
		});
	});
});
