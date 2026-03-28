import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefresh } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/orders/hooks/use-refresh-orders", () => ({
	useRefreshOrders: () => ({ refresh: mockRefresh, isPending: false }),
}));

vi.mock("@/shared/components/refresh-button", () => ({
	RefreshButton: ({
		label,
		isPending,
		className,
		variant,
	}: {
		onRefresh: () => void;
		isPending: boolean;
		label: string;
		className?: string;
		variant?: string;
	}) => (
		<button
			data-testid="refresh-button"
			data-pending={isPending}
			data-variant={variant}
			className={className}
			aria-label={label}
		>
			{label}
		</button>
	),
}));

import { RefreshOrdersButton } from "../refresh-orders-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("RefreshOrdersButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", () => {
		render(<RefreshOrdersButton />);
		expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
	});

	it("renders with label 'Rafraîchir commandes'", () => {
		render(<RefreshOrdersButton />);
		expect(screen.getByRole("button", { name: "Rafraîchir commandes" })).toBeInTheDocument();
	});

	it("uses outline variant by default", () => {
		render(<RefreshOrdersButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "outline");
	});

	it("respects variant prop", () => {
		render(<RefreshOrdersButton variant="ghost" />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "ghost");
	});

	it("passes className prop to RefreshButton", () => {
		render(<RefreshOrdersButton className="custom-class" />);
		expect(screen.getByTestId("refresh-button")).toHaveClass("custom-class");
	});

	it("shows not pending initially", () => {
		render(<RefreshOrdersButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-pending", "false");
	});
});
