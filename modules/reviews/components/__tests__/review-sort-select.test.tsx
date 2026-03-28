import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/creations/bague",
	useSearchParams: () => ({
		get: () => null,
		toString: () => "",
	}),
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({
		children,
		value,
		disabled,
	}: {
		children: React.ReactNode;
		value?: string;
		disabled?: boolean;
		onValueChange?: (value: string) => void;
	}) => (
		<div data-testid="select" data-value={value} data-disabled={disabled}>
			{children}
		</div>
	),
	SelectTrigger: ({
		children,
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
	}) => (
		<button data-testid="select-trigger" aria-label={ariaLabel} className={className}>
			{children}
		</button>
	),
	SelectValue: ({ placeholder }: { placeholder?: string }) => (
		<span data-testid="select-value" data-placeholder={placeholder} />
	),
	SelectContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-content">{children}</div>
	),
	SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid="select-item" data-value={value}>
			{children}
		</div>
	),
}));

import { ReviewSortSelect } from "../review-sort-select";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewSortSelect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the select trigger with aria-label 'Trier les avis'", () => {
		render(<ReviewSortSelect />);
		expect(screen.getByRole("button", { name: "Trier les avis" })).toBeInTheDocument();
	});

	it("renders all four sort options", () => {
		render(<ReviewSortSelect />);
		expect(screen.getByText("Plus récents")).toBeInTheDocument();
		expect(screen.getByText("Plus anciens")).toBeInTheDocument();
		expect(screen.getByText("Meilleures notes")).toBeInTheDocument();
		expect(screen.getByText("Notes les plus basses")).toBeInTheDocument();
	});

	it("renders select items with correct values", () => {
		render(<ReviewSortSelect />);
		const items = screen.getAllByTestId("select-item");
		expect(items.length).toBe(4);
	});

	it("defaults to 'createdAt-desc' value", () => {
		render(<ReviewSortSelect />);
		const select = screen.getByTestId("select");
		expect(select).toHaveAttribute("data-value", "createdAt-desc");
	});

	it("renders without error", () => {
		expect(() => render(<ReviewSortSelect />)).not.toThrow();
	});
});
