import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { selectionState, mockHandleItemSelectionChange } = vi.hoisted(() => ({
	selectionState: {
		selectedItems: [] as string[],
		isSelected: (id: string) => false,
		getSelectedCount: () => 0,
	},
	mockHandleItemSelectionChange: vi.fn(),
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		isSelected: selectionState.isSelected,
		handleItemSelectionChange: mockHandleItemSelectionChange,
		getSelectedCount: selectionState.getSelectedCount,
		areAllSelected: () => false,
		areSomeSelected: () => false,
		handleSelectionChange: vi.fn(),
		selectedItems: selectionState.selectedItems,
		clearSelection: vi.fn(),
		clearItems: vi.fn(),
		isPending: false,
	}),
}));

const mockHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("motion/react", () => ({
	m: {
		span: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
			// Filter out motion-specific props
			const { initial, animate, exit, transition, ...rest } = props as Record<string, unknown>;
			void initial;
			void animate;
			void exit;
			void transition;
			return <span {...rest}>{children}</span>;
		},
	},
	useReducedMotion: () => false,
}));

vi.mock("lucide-react", () => ({
	Check: () => <svg data-testid="check-icon" />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

import { SelectableMobileCard } from "../selectable-mobile-card";

function setupSelection(opts: { count?: number; selectedIds?: string[] } = {}) {
	const selected = opts.selectedIds ?? [];
	selectionState.selectedItems = selected;
	selectionState.isSelected = (id: string) => selected.includes(id);
	selectionState.getSelectedCount = () => opts.count ?? selected.length;
}

afterEach(cleanup);

describe("SelectableMobileCard", () => {
	beforeEach(() => {
		mockHaptic.mockClear();
		mockHandleItemSelectionChange.mockClear();
		setupSelection();
	});

	describe("rendering", () => {
		it("renders children", () => {
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			expect(screen.getByText("content")).toBeInTheDocument();
		});

		it("has role=button and tabIndex", () => {
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			const card = screen.getByRole("button", { name: /Item A/ });
			expect(card).toHaveAttribute("tabindex", "0");
		});

		it("does not show checkmark when not selected", () => {
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			expect(screen.queryByTestId("check-icon")).not.toBeInTheDocument();
		});

		it("shows checkmark overlay when selected", () => {
			setupSelection({ selectedIds: ["a"], count: 1 });
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			expect(screen.getByTestId("check-icon")).toBeInTheDocument();
		});

		it("sets data-selected attribute when selected", () => {
			setupSelection({ selectedIds: ["a"], count: 1 });
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			expect(screen.getByRole("button")).toHaveAttribute("data-selected", "true");
		});

		it("sets aria-pressed when selection mode is active", () => {
			setupSelection({ selectedIds: ["a"], count: 1 });
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
		});

		it("enriches aria-label with selection state when mode active", () => {
			setupSelection({ selectedIds: ["a"], count: 1 });
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			const card = screen.getByRole("button");
			expect(card.getAttribute("aria-label")).toContain("Sélectionné");
		});
	});

	describe("tap (no selection mode)", () => {
		it("calls onOpen on click", async () => {
			const onOpen = vi.fn();
			const user = userEvent.setup();
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={onOpen}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			await user.click(screen.getByRole("button"));
			expect(onOpen).toHaveBeenCalledTimes(1);
			expect(mockHaptic).toHaveBeenCalledWith("selection");
		});

		it("does not toggle selection on tap", async () => {
			const user = userEvent.setup();
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			await user.click(screen.getByRole("button"));
			expect(mockHandleItemSelectionChange).not.toHaveBeenCalled();
		});
	});

	describe("tap (selection mode active)", () => {
		it("toggles selection on tap instead of calling onOpen", async () => {
			setupSelection({ selectedIds: ["b"], count: 1 });
			const onOpen = vi.fn();
			const user = userEvent.setup();
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={onOpen}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			await user.click(screen.getByRole("button"));
			expect(mockHandleItemSelectionChange).toHaveBeenCalledWith("a", true);
			expect(onOpen).not.toHaveBeenCalled();
		});

		it("deselects when already selected", async () => {
			setupSelection({ selectedIds: ["a"], count: 1 });
			const user = userEvent.setup();
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			await user.click(screen.getByRole("button"));
			expect(mockHandleItemSelectionChange).toHaveBeenCalledWith("a", false);
		});
	});

	describe("keyboard", () => {
		it("Enter triggers onOpen when not in selection mode", async () => {
			const onOpen = vi.fn();
			const user = userEvent.setup();
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={onOpen}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			screen.getByRole("button").focus();
			await user.keyboard("{Enter}");
			expect(onOpen).toHaveBeenCalled();
		});

		it("Shift+Enter toggles selection (power user shortcut)", async () => {
			const user = userEvent.setup();
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
					<span>content</span>
				</SelectableMobileCard>,
			);
			screen.getByRole("button").focus();
			await user.keyboard("{Shift>}{Enter}{/Shift}");
			expect(mockHandleItemSelectionChange).toHaveBeenCalledWith("a", true);
			expect(mockHaptic).toHaveBeenCalledWith("medium");
		});
	});

	describe("long-press", () => {
		it("fires haptic medium + toggles selection after 450ms pointerdown", () => {
			vi.useFakeTimers();
			try {
				render(
					<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
						<span>content</span>
					</SelectableMobileCard>,
				);
				const card = screen.getByRole("button");
				fireEvent.pointerDown(card, { clientX: 0, clientY: 0, pointerType: "touch" });
				vi.advanceTimersByTime(450);
				expect(mockHaptic).toHaveBeenCalledWith("medium");
				expect(mockHandleItemSelectionChange).toHaveBeenCalledWith("a", true);
			} finally {
				vi.useRealTimers();
			}
		});

		it("cancels long-press when pointer moves beyond tolerance", () => {
			vi.useFakeTimers();
			try {
				render(
					<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={vi.fn()}>
						<span>content</span>
					</SelectableMobileCard>,
				);
				const card = screen.getByRole("button");
				fireEvent.pointerDown(card, { clientX: 0, clientY: 0, pointerType: "touch" });
				fireEvent.pointerMove(card, { clientX: 50, clientY: 0 });
				vi.advanceTimersByTime(500);
				expect(mockHandleItemSelectionChange).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe("disableSelection", () => {
		it("ignores long-press and keeps tap = onOpen", async () => {
			const onOpen = vi.fn();
			const user = userEvent.setup();
			setupSelection({ selectedIds: ["b"], count: 1 });
			render(
				<SelectableMobileCard itemId="a" ariaLabel="Item A" onOpen={onOpen} disableSelection>
					<span>content</span>
				</SelectableMobileCard>,
			);
			await user.click(screen.getByRole("button"));
			expect(onOpen).toHaveBeenCalled();
			expect(mockHandleItemSelectionChange).not.toHaveBeenCalled();
		});
	});
});
