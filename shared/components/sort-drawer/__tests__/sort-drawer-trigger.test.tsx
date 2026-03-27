import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSearchParams } = vi.hoisted(() => ({
	mockSearchParams: { value: new URLSearchParams() },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams.value,
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	}),
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
	ArrowUpDown: ({ className }: { className?: string }) => (
		<svg data-testid="arrow-up-down-icon" className={className} />
	),
}));

// Mock SortDrawer to avoid rendering the full drawer in trigger tests
vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
	AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
	m: { div: "div" },
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({ children }: any) => <div>{children}</div>,
	DrawerBody: ({ children }: any) => <div>{children}</div>,
	DrawerContent: ({ children }: any) => <div>{children}</div>,
	DrawerHeader: ({ children }: any) => <div>{children}</div>,
	DrawerTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/shared/types/sort.types", () => ({}));

vi.mock("../sort-drawer", () => ({
	SortDrawer: ({ open }: { open: boolean }) =>
		open ? <div data-testid="sort-drawer-mock" /> : null,
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import React from "react";
import { SortDrawerTrigger } from "../sort-drawer-trigger";
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

// ============================================================================
// TESTS
// ============================================================================

describe("SortDrawerTrigger", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.value = new URLSearchParams();
	});

	afterEach(cleanup);

	// ============================================================================
	// Rendering
	// ============================================================================

	describe("rendering", () => {
		it("renders button with aria-label 'Trier'", () => {
			render(<SortDrawerTrigger options={mockOptions} />);

			expect(screen.getByRole("button", { name: "Trier" })).toBeInTheDocument();
		});

		it("renders ArrowUpDown icon", () => {
			render(<SortDrawerTrigger options={mockOptions} />);

			expect(screen.getByTestId("arrow-up-down-icon")).toBeInTheDocument();
		});

		it("does not render sort drawer by default (closed)", () => {
			render(<SortDrawerTrigger options={mockOptions} />);

			expect(screen.queryByTestId("sort-drawer-mock")).not.toBeInTheDocument();
		});

		it("opens sort drawer when button is clicked", () => {
			render(<SortDrawerTrigger options={mockOptions} />);

			fireEvent.click(screen.getByRole("button", { name: "Trier" }));

			expect(screen.getByTestId("sort-drawer-mock")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// Active sort indicator
	// ============================================================================

	describe("active sort indicator", () => {
		it("shows active indicator dot when URL has filterKey param", () => {
			setSearchParams({ sortBy: "price-ascending" });
			render(<SortDrawerTrigger options={mockOptions} />);

			// The indicator span is aria-hidden, so we query by its presence in the DOM
			const button = screen.getByRole("button", { name: "Trier" });
			const indicator = button.querySelector('[aria-hidden="true"]');
			expect(indicator).toBeInTheDocument();
		});

		it("does not show active indicator when no sort param in URL", () => {
			render(<SortDrawerTrigger options={mockOptions} />);

			const button = screen.getByRole("button", { name: "Trier" });
			const indicator = button.querySelector('[aria-hidden="true"]');
			expect(indicator).not.toBeInTheDocument();
		});

		it("shows indicator for custom filterKey when that param is in URL", () => {
			setSearchParams({ customSort: "price-descending" });
			render(<SortDrawerTrigger options={mockOptions} filterKey="customSort" />);

			const button = screen.getByRole("button", { name: "Trier" });
			const indicator = button.querySelector('[aria-hidden="true"]');
			expect(indicator).toBeInTheDocument();
		});

		it("does not show indicator for custom filterKey when default sortBy param is in URL", () => {
			setSearchParams({ sortBy: "price-ascending" });
			render(<SortDrawerTrigger options={mockOptions} filterKey="customSort" />);

			const button = screen.getByRole("button", { name: "Trier" });
			const indicator = button.querySelector('[aria-hidden="true"]');
			expect(indicator).not.toBeInTheDocument();
		});
	});

	// ============================================================================
	// Accessibility
	// ============================================================================

	describe("accessibility", () => {
		it("indicator span is aria-hidden to prevent screen reader noise", () => {
			setSearchParams({ sortBy: "price-ascending" });
			render(<SortDrawerTrigger options={mockOptions} />);

			const button = screen.getByRole("button", { name: "Trier" });
			const indicator = button.querySelector('[aria-hidden="true"]');
			expect(indicator).toHaveAttribute("aria-hidden", "true");
		});
	});
});
