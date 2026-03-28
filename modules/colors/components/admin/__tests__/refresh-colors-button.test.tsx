import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefresh, mockIsPending } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/modules/colors/hooks/use-refresh-colors", () => ({
	useRefreshColors: () => ({
		refresh: mockRefresh,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("@/shared/components/refresh-button", () => ({
	RefreshButton: ({
		onRefresh,
		isPending,
		label,
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
			data-label={label}
			data-variant={variant}
			className={className}
			onClick={onRefresh}
		>
			{label}
		</button>
	),
}));

import { RefreshColorsButton } from "../refresh-colors-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("RefreshColorsButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders RefreshButton", () => {
		render(<RefreshColorsButton />);
		expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
	});

	it("passes correct label 'Rafraîchir couleurs'", () => {
		render(<RefreshColorsButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute(
			"data-label",
			"Rafraîchir couleurs",
		);
	});

	it("shows 'Rafraîchir couleurs' text", () => {
		render(<RefreshColorsButton />);
		expect(screen.getByText("Rafraîchir couleurs")).toBeInTheDocument();
	});

	it("uses default 'outline' variant when no variant prop provided", () => {
		render(<RefreshColorsButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "outline");
	});

	it("passes custom variant prop to RefreshButton", () => {
		render(<RefreshColorsButton variant="ghost" />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "ghost");
	});

	it("passes isPending=false to RefreshButton when not pending", () => {
		mockIsPending.value = false;
		render(<RefreshColorsButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-pending", "false");
	});

	it("passes isPending=true to RefreshButton when pending", () => {
		mockIsPending.value = true;
		render(<RefreshColorsButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-pending", "true");
	});
});
