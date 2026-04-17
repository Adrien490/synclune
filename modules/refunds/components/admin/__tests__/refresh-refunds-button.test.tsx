import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRefresh, mockUseRefreshRefunds } = vi.hoisted(() => {
	const mockRefresh = vi.fn();
	return {
		mockRefresh,
		mockUseRefreshRefunds: vi.fn(() => ({ refresh: mockRefresh, isPending: false })),
	};
});

vi.mock("@/modules/refunds/hooks/use-refresh-refunds", () => ({
	useRefreshRefunds: mockUseRefreshRefunds,
}));

vi.mock("@/shared/components/refresh-button", () => ({
	RefreshButton: ({
		onRefresh,
		isPending,
		label,
		variant,
		className,
		hideOnMobile,
	}: {
		onRefresh: () => void;
		isPending: boolean;
		label: string;
		variant?: string;
		className?: string;
		hideOnMobile?: boolean;
	}) => (
		<button
			type="button"
			data-testid="refresh-button"
			data-pending={isPending}
			data-variant={variant}
			data-hide-on-mobile={hideOnMobile}
			className={className}
			aria-label={label}
			onClick={onRefresh}
		>
			{label}
		</button>
	),
}));

import { RefreshRefundsButton } from "../refresh-refunds-button";

afterEach(cleanup);

describe("RefreshRefundsButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseRefreshRefunds.mockReturnValue({ refresh: mockRefresh, isPending: false });
	});

	it("renders the refresh button with French label", () => {
		render(<RefreshRefundsButton />);

		expect(screen.getByRole("button", { name: /Rafraîchir remboursements/i })).toBeInTheDocument();
	});

	it("calls refresh when clicked", async () => {
		render(<RefreshRefundsButton />);

		await userEvent.click(screen.getByRole("button"));

		expect(mockRefresh).toHaveBeenCalledTimes(1);
	});

	it("propagates isPending=true from the hook", () => {
		mockUseRefreshRefunds.mockReturnValue({ refresh: mockRefresh, isPending: true });

		render(<RefreshRefundsButton />);

		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-pending", "true");
	});

	it("uses 'outline' variant by default", () => {
		render(<RefreshRefundsButton />);

		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "outline");
	});

	it("accepts a custom variant", () => {
		render(<RefreshRefundsButton variant="ghost" />);

		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "ghost");
	});

	it("forwards className to RefreshButton", () => {
		render(<RefreshRefundsButton className="custom" />);

		expect(screen.getByTestId("refresh-button")).toHaveClass("custom");
	});

	it("sets hideOnMobile=false (refresh visible everywhere)", () => {
		render(<RefreshRefundsButton />);

		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-hide-on-mobile", "false");
	});
});
