import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockSearchParams, mockReducedMotion } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockSearchParams: { value: new URLSearchParams() },
	mockReducedMotion: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => mockSearchParams.value,
}));

vi.mock("motion/react", () => ({
	useReducedMotion: () => mockReducedMotion.value,
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		div: ({
			children,
			initial: _initial,
			animate: _animate,
			exit: _exit,
			transition: _transition,
			...props
		}: Record<string, unknown> & { children?: React.ReactNode }) => (
			<div {...props}>{children}</div>
		),
	},
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({ children, open, onOpenChange: _onOpenChange }: any) =>
		open ? (
			<div data-testid="drawer" data-open={open}>
				{children}
			</div>
		) : null,
	DrawerContent: ({ children, className }: any) => (
		<div data-testid="drawer-content" className={className}>
			{children}
		</div>
	),
	DrawerHeader: ({ children, className }: any) => (
		<div data-testid="drawer-header" className={className}>
			{children}
		</div>
	),
	DrawerTitle: ({ children, className }: any) => (
		<h2 data-testid="drawer-title" className={className}>
			{children}
		</h2>
	),
	DrawerBody: ({ children, className }: any) => (
		<div data-testid="drawer-body" className={className}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		className,
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		className?: string;
	}) => (
		<button onClick={onClick} aria-label={ariaLabel} className={className}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Check: ({ className }: { className?: string }) => (
		<svg data-testid="check-icon" className={className} aria-hidden="true" />
	),
	X: ({ className }: { className?: string }) => (
		<svg data-testid="x-icon" className={className} aria-hidden="true" />
	),
}));

// Mock useOptimistic as useState so optimistic value tracks directly
vi.mock("react", async () => {
	const actual = (await vi.importActual("react")) as typeof React;
	return {
		...actual,
		useOptimistic: (initialValue: unknown) => {
			const [state, setState] = actual.useState(initialValue);
			return [state, setState] as [unknown, (v: unknown) => void];
		},
		useTransition: () => [false, (fn: () => void) => fn()],
	};
});

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import React from "react";
import { SortDrawer } from "../sort-drawer";
import type { SortOption } from "@/shared/types/sort.types";

// ============================================================================
// HELPERS
// ============================================================================

const mockOptions: SortOption[] = [
	{ value: "price-ascending", label: "Prix croissant" },
	{ value: "price-descending", label: "Prix décroissant" },
	{ value: "created-descending", label: "Plus récents" },
];

function setSearchParams(params: Record<string, string>) {
	mockSearchParams.value = new URLSearchParams(params);
}

function renderDrawer(props: Partial<React.ComponentProps<typeof SortDrawer>> = {}) {
	return render(<SortDrawer open={true} onOpenChange={vi.fn()} options={mockOptions} {...props} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("SortDrawer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		mockSearchParams.value = new URLSearchParams();
	});

	afterEach(cleanup);

	// ============================================================================
	// Rendering
	// ============================================================================

	describe("rendering", () => {
		it("does not render when open is false", () => {
			render(<SortDrawer open={false} onOpenChange={vi.fn()} options={mockOptions} />);

			expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
		});

		it("renders when open is true", () => {
			renderDrawer();

			expect(screen.getByTestId("drawer")).toBeInTheDocument();
		});

		it("renders radiogroup with default aria-label 'Trier par'", () => {
			renderDrawer();

			expect(screen.getByRole("radiogroup", { name: "Trier par" })).toBeInTheDocument();
		});

		it("renders radiogroup with custom title", () => {
			renderDrawer({ title: "Organiser par" });

			expect(screen.getByRole("radiogroup", { name: "Organiser par" })).toBeInTheDocument();
		});

		it("renders all options as radio buttons", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			expect(radios).toHaveLength(mockOptions.length);
		});

		it("renders each option label", () => {
			renderDrawer();

			expect(screen.getByText("Prix croissant")).toBeInTheDocument();
			expect(screen.getByText("Prix décroissant")).toBeInTheDocument();
			expect(screen.getByText("Plus récents")).toBeInTheDocument();
		});

		it("renders reset option when showResetOption=true", () => {
			renderDrawer({ showResetOption: true, resetLabel: "Par défaut" });

			const radios = screen.getAllByRole("radio");
			expect(radios).toHaveLength(mockOptions.length + 1);
			expect(screen.getByText("Par défaut")).toBeInTheDocument();
		});

		it("does not render reset option when showResetOption=false", () => {
			renderDrawer({ showResetOption: false });

			const radios = screen.getAllByRole("radio");
			expect(radios).toHaveLength(mockOptions.length);
		});

		it("displays selected label in header when a sort is active", () => {
			setSearchParams({ sortBy: "price-ascending" });
			renderDrawer();

			expect(screen.getByText("(Prix croissant)")).toBeInTheDocument();
		});

		it("does not display selected label in header when no sort is active", () => {
			renderDrawer();

			expect(screen.queryByText(/\(.*\)/)).not.toBeInTheDocument();
		});
	});

	// ============================================================================
	// Aria-checked state
	// ============================================================================

	describe("aria-checked state", () => {
		it("currently selected value from URL has aria-checked='true'", () => {
			setSearchParams({ sortBy: "price-ascending" });
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			const selected = radios.find((r) => r.getAttribute("aria-checked") === "true");
			expect(selected).toHaveTextContent("Prix croissant");
		});

		it("non-selected options have aria-checked='false'", () => {
			setSearchParams({ sortBy: "price-ascending" });
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			const unselected = radios.filter((r) => r.getAttribute("aria-checked") === "false");
			expect(unselected).toHaveLength(2);
		});

		it("all options have aria-checked='false' when no sort param in URL", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			radios.forEach((radio) => {
				expect(radio).toHaveAttribute("aria-checked", "false");
			});
		});

		it("reset option has aria-checked='true' when no sort param in URL and showResetOption=true", () => {
			renderDrawer({ showResetOption: true });

			const radios = screen.getAllByRole("radio");
			const resetRadio = radios[0]!;
			expect(resetRadio).toHaveAttribute("aria-checked", "true");
		});
	});

	// ============================================================================
	// Close button
	// ============================================================================

	describe("close button", () => {
		it("renders close button with aria-label 'Fermer'", () => {
			renderDrawer();

			expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
		});

		it("clicking close button calls onOpenChange(false)", () => {
			const onOpenChange = vi.fn();
			renderDrawer({ onOpenChange });

			fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	// ============================================================================
	// Live region
	// ============================================================================

	describe("live region", () => {
		it("renders live region with role='status' and aria-live='polite'", () => {
			renderDrawer();

			const status = screen.getByRole("status");
			expect(status).toHaveAttribute("aria-live", "polite");
		});
	});

	// ============================================================================
	// Keyboard navigation
	// ============================================================================

	describe("keyboard navigation", () => {
		it("ArrowDown moves focus to next option", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			radios[0]!.focus();
			fireEvent.keyDown(radios[0]!, { key: "ArrowDown" });

			expect(document.activeElement).toBe(radios[1]);
		});

		it("ArrowRight moves focus to next option", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			radios[0]!.focus();
			fireEvent.keyDown(radios[0]!, { key: "ArrowRight" });

			expect(document.activeElement).toBe(radios[1]);
		});

		it("ArrowUp moves focus to previous option", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			radios[1]!.focus();
			fireEvent.keyDown(radios[1]!, { key: "ArrowUp" });

			expect(document.activeElement).toBe(radios[0]);
		});

		it("ArrowLeft moves focus to previous option", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			radios[2]!.focus();
			fireEvent.keyDown(radios[2]!, { key: "ArrowLeft" });

			expect(document.activeElement).toBe(radios[1]);
		});

		it("Home key focuses first option", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			radios[2]!.focus();
			fireEvent.keyDown(radios[2]!, { key: "Home" });

			expect(document.activeElement).toBe(radios[0]);
		});

		it("End key focuses last option", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			radios[0]!.focus();
			fireEvent.keyDown(radios[0]!, { key: "End" });

			expect(document.activeElement).toBe(radios[radios.length - 1]);
		});

		it("ArrowDown wraps from last to first option", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			const lastIndex = radios.length - 1;
			radios[lastIndex]!.focus();
			fireEvent.keyDown(radios[lastIndex]!, { key: "ArrowDown" });

			expect(document.activeElement).toBe(radios[0]);
		});

		it("ArrowUp wraps from first to last option", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			radios[0]!.focus();
			fireEvent.keyDown(radios[0]!, { key: "ArrowUp" });

			expect(document.activeElement).toBe(radios[radios.length - 1]);
		});
	});

	// ============================================================================
	// Selection
	// ============================================================================

	describe("selection", () => {
		it("clicking an option calls router.push with updated params", () => {
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			fireEvent.click(radios[0]!);

			expect(mockPush).toHaveBeenCalledTimes(1);
			const url = mockPush.mock.calls[0]![0] as string;
			const params = new URLSearchParams(url.replace(/^\?/, ""));
			expect(params.get("sortBy")).toBe("price-ascending");
		});

		it("selecting resets pagination (deletes cursor/direction, sets page=1)", () => {
			setSearchParams({ sortBy: "price-descending", cursor: "abc", direction: "next", page: "3" });
			renderDrawer();

			const radios = screen.getAllByRole("radio");
			fireEvent.click(radios[0]!);

			const url = mockPush.mock.calls[0]![0] as string;
			const params = new URLSearchParams(url.replace(/^\?/, ""));
			expect(params.has("cursor")).toBe(false);
			expect(params.has("direction")).toBe(false);
			expect(params.get("page")).toBe("1");
		});

		it("autoCloseOnSelect=false does not call onOpenChange after selection", () => {
			vi.useFakeTimers();
			const onOpenChange = vi.fn();
			renderDrawer({ autoCloseOnSelect: false, onOpenChange });

			const radios = screen.getAllByRole("radio");
			fireEvent.click(radios[0]!);
			vi.runAllTimers();

			expect(onOpenChange).not.toHaveBeenCalled();
		});
	});
});
