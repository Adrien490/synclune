import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefresh, mockRefreshButton, mockUseRefreshVariants } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
	mockRefreshButton: vi.fn(),
	mockUseRefreshVariants: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/variants/hooks/use-refresh-variants", () => ({
	useRefreshVariants: mockUseRefreshVariants,
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

import { RefreshVariantsButton } from "../refresh-variants-button";

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
	mockUseRefreshVariants.mockReturnValue({ refresh: mockRefresh, isPending: false });
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("RefreshVariantsButton", () => {
	it("renders the RefreshButton", () => {
		render(<RefreshVariantsButton />);

		expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
	});

	it('passes label "Rafraîchir variantes" to RefreshButton', () => {
		render(<RefreshVariantsButton />);

		expect(mockRefreshButton).toHaveBeenCalledWith(
			expect.objectContaining({ label: "Rafraîchir variantes" }),
		);
	});

	it('uses "outline" as default variant', () => {
		render(<RefreshVariantsButton />);

		expect(mockRefreshButton).toHaveBeenCalledWith(expect.objectContaining({ variant: "outline" }));
	});

	it("forwards variant prop to RefreshButton", () => {
		render(<RefreshVariantsButton variant="ghost" />);

		expect(mockRefreshButton).toHaveBeenCalledWith(expect.objectContaining({ variant: "ghost" }));
	});

	it("forwards className prop to RefreshButton", () => {
		render(<RefreshVariantsButton className="my-class" />);

		expect(mockRefreshButton).toHaveBeenCalledWith(
			expect.objectContaining({ className: "my-class" }),
		);
	});

	it("passes isPending from useRefreshVariants to RefreshButton", () => {
		mockUseRefreshVariants.mockReturnValue({ refresh: mockRefresh, isPending: true });

		render(<RefreshVariantsButton />);

		expect(mockRefreshButton).toHaveBeenCalledWith(expect.objectContaining({ isPending: true }));
	});

	it("passes refresh fn from useRefreshVariants as onRefresh to RefreshButton", () => {
		render(<RefreshVariantsButton />);

		expect(mockRefreshButton).toHaveBeenCalledWith(
			expect.objectContaining({ onRefresh: mockRefresh }),
		);
	});

	it("calls useRefreshVariants with productId when provided", () => {
		render(<RefreshVariantsButton productId="prod-1" />);

		expect(mockUseRefreshVariants).toHaveBeenCalledWith({ productId: "prod-1" });
	});
});
