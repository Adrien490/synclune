import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSelectionContext } = vi.hoisted(() => ({
	mockSelectionContext: {
		getSelectedCount: vi.fn(() => 0),
		clearSelection: vi.fn(),
		isSelected: vi.fn(() => false),
		handleItemSelectionChange: vi.fn(),
		areAllSelected: vi.fn(() => false),
		areSomeSelected: vi.fn(() => false),
		handleSelectionChange: vi.fn(),
		selectedItems: [] as string[],
		isPending: false,
		clearItems: vi.fn(),
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => mockSelectionContext,
}));

vi.mock("motion/react", () => {
	const { forwardRef: fRef, createElement } = require("react");
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		m: {
			div: fRef(
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
				) => createElement("div", { ref, ...props }, children),
			),
			span: fRef(
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
				) => createElement("span", { ref, ...props }, children),
			),
		},
		useReducedMotion: () => false,
	};
});

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { duration: { collapse: 0.2 }, easing: { collapse: [0.4, 0, 0.2, 1] } },
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label"?: string }) => (
		<button onClick={onClick} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	X: (props: Record<string, unknown>) => {
		const { createElement } = require("react");
		return createElement("svg", { "data-testid": "x-icon", ...props });
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import React from "react";
import { SelectionToolbar } from "../selection-toolbar";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockSelectionContext.getSelectedCount.mockReturnValue(0);
	mockSelectionContext.clearSelection.mockReset();
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("SelectionToolbar", () => {
	// ============================================================================
	// HIDDEN WHEN EMPTY
	// ============================================================================

	describe("hidden when no selection", () => {
		it("does not render toolbar content when selected count is 0", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(0);
			const { container } = render(<SelectionToolbar>actions</SelectionToolbar>);

			expect(container.querySelector("[role='toolbar']")).not.toBeInTheDocument();
		});

		it("renders nothing visible with 0 selected items", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(0);
			render(
				<SelectionToolbar>
					<button>Delete</button>
				</SelectionToolbar>,
			);

			expect(screen.queryByText("Delete")).not.toBeInTheDocument();
		});
	});

	// ============================================================================
	// RENDER WITH COUNT
	// ============================================================================

	describe("render with count", () => {
		it("renders toolbar with role='toolbar' when count > 0", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(1);
			render(<SelectionToolbar>actions</SelectionToolbar>);

			expect(screen.getByRole("toolbar")).toBeInTheDocument();
		});

		it("has aria-label on toolbar element", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(1);
			render(<SelectionToolbar>actions</SelectionToolbar>);

			expect(screen.getByRole("toolbar")).toHaveAttribute("aria-label", "Actions sur la sélection");
		});

		it("displays the selected count", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(3);
			render(<SelectionToolbar>actions</SelectionToolbar>);

			expect(screen.getByText("3")).toBeInTheDocument();
		});

		it("shows singular label 'sélectionné' for 1 item", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(1);
			render(<SelectionToolbar>actions</SelectionToolbar>);

			expect(screen.getByText("sélectionné")).toBeInTheDocument();
		});

		it("shows plural label 'sélectionnés' for multiple items", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(5);
			render(<SelectionToolbar>actions</SelectionToolbar>);

			expect(screen.getByText("sélectionnés")).toBeInTheDocument();
		});

		it("counter label has aria-live='polite' and aria-atomic='true'", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(2);
			render(<SelectionToolbar>actions</SelectionToolbar>);

			const liveText = screen.getByText("sélectionnés");
			expect(liveText).toHaveAttribute("aria-live", "polite");
			expect(liveText).toHaveAttribute("aria-atomic", "true");
		});
	});

	// ============================================================================
	// CHILDREN RENDERING
	// ============================================================================

	describe("children rendering", () => {
		it("renders action children inside the toolbar", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(2);
			render(
				<SelectionToolbar>
					<button data-testid="delete-btn">Supprimer</button>
				</SelectionToolbar>,
			);

			expect(screen.getByTestId("delete-btn")).toBeInTheDocument();
		});

		it("renders multiple children", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(1);
			render(
				<SelectionToolbar>
					<button data-testid="edit-btn">Modifier</button>
					<button data-testid="delete-btn">Supprimer</button>
				</SelectionToolbar>,
			);

			expect(screen.getByTestId("edit-btn")).toBeInTheDocument();
			expect(screen.getByTestId("delete-btn")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// CLEAR SELECTION
	// ============================================================================

	describe("clear selection button", () => {
		it("renders a clear selection button with correct aria-label", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(2);
			render(<SelectionToolbar>actions</SelectionToolbar>);

			expect(screen.getByRole("button", { name: "Effacer la sélection" })).toBeInTheDocument();
		});

		it("calls clearSelection when the clear button is clicked", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(2);
			render(<SelectionToolbar>actions</SelectionToolbar>);

			fireEvent.click(screen.getByRole("button", { name: "Effacer la sélection" }));

			expect(mockSelectionContext.clearSelection).toHaveBeenCalledTimes(1);
		});

		it("renders X icon inside the clear button", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(1);
			render(<SelectionToolbar>actions</SelectionToolbar>);

			expect(screen.getByTestId("x-icon")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// ANIMATIONS
	// ============================================================================

	describe("animations", () => {
		it("toolbar wrapper uses grid layout class for grid-rows animation", () => {
			mockSelectionContext.getSelectedCount.mockReturnValue(1);
			const { container } = render(<SelectionToolbar>actions</SelectionToolbar>);

			// The outer m.div carries the "mb-4 grid" classes for grid-rows animation
			const gridWrapper = container.querySelector(".grid");
			expect(gridWrapper).toBeInTheDocument();
			expect(gridWrapper?.className).toContain("mb-4");
		});
	});
});
