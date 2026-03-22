import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefresh, mockRefreshButton, mockUseRefreshSkus } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
	mockRefreshButton: vi.fn(),
	mockUseRefreshSkus: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/skus/hooks/use-refresh-skus", () => ({
	useRefreshSkus: mockUseRefreshSkus,
}));

vi.mock("@/shared/components/refresh-button", () => ({
	RefreshButton: (props: Record<string, unknown>) => {
		mockRefreshButton(props);
		return <button data-testid="refresh-button">{props.label as string}</button>;
	},
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { RefreshSkusButton } from "../refresh-skus-button";

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
	mockUseRefreshSkus.mockReturnValue({ refresh: mockRefresh, isPending: false });
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("RefreshSkusButton", () => {
	it("renders the RefreshButton", () => {
		render(<RefreshSkusButton />);

		expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
	});

	it('passes label "Rafraîchir variantes" to RefreshButton', () => {
		render(<RefreshSkusButton />);

		expect(mockRefreshButton).toHaveBeenCalledWith(
			expect.objectContaining({ label: "Rafraîchir variantes" }),
		);
	});

	it('uses "outline" as default variant', () => {
		render(<RefreshSkusButton />);

		expect(mockRefreshButton).toHaveBeenCalledWith(expect.objectContaining({ variant: "outline" }));
	});

	it("forwards variant prop to RefreshButton", () => {
		render(<RefreshSkusButton variant="ghost" />);

		expect(mockRefreshButton).toHaveBeenCalledWith(expect.objectContaining({ variant: "ghost" }));
	});

	it("forwards className prop to RefreshButton", () => {
		render(<RefreshSkusButton className="my-class" />);

		expect(mockRefreshButton).toHaveBeenCalledWith(
			expect.objectContaining({ className: "my-class" }),
		);
	});

	it("passes isPending from useRefreshSkus to RefreshButton", () => {
		mockUseRefreshSkus.mockReturnValue({ refresh: mockRefresh, isPending: true });

		render(<RefreshSkusButton />);

		expect(mockRefreshButton).toHaveBeenCalledWith(expect.objectContaining({ isPending: true }));
	});

	it("passes refresh fn from useRefreshSkus as onRefresh to RefreshButton", () => {
		render(<RefreshSkusButton />);

		expect(mockRefreshButton).toHaveBeenCalledWith(
			expect.objectContaining({ onRefresh: mockRefresh }),
		);
	});

	it("calls useRefreshSkus with productId when provided", () => {
		render(<RefreshSkusButton productId="prod-1" />);

		expect(mockUseRefreshSkus).toHaveBeenCalledWith({ productId: "prod-1" });
	});
});
