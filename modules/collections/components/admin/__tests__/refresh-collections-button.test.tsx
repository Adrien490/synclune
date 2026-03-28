import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefresh } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
}));

vi.mock("@/modules/collections/hooks/use-refresh-collections", () => ({
	useRefreshCollections: () => ({
		refresh: mockRefresh,
		isPending: false,
	}),
}));

vi.mock("@/shared/components/refresh-button", () => ({
	RefreshButton: ({
		label,
		onRefresh,
		isPending,
		className,
		variant,
	}: {
		label: string;
		onRefresh: () => void;
		isPending: boolean;
		className?: string;
		variant?: string;
	}) => (
		<button
			data-testid="refresh-button"
			data-pending={String(isPending)}
			data-variant={variant}
			className={className}
			onClick={onRefresh}
		>
			{label}
		</button>
	),
}));

import { RefreshCollectionsButton } from "../refresh-collections-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("RefreshCollectionsButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with label 'Rafraîchir collections'", () => {
		render(<RefreshCollectionsButton />);
		expect(screen.getByText("Rafraîchir collections")).toBeInTheDocument();
	});

	it("renders the refresh button", () => {
		render(<RefreshCollectionsButton />);
		expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
	});

	it("uses default 'outline' variant", () => {
		render(<RefreshCollectionsButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "outline");
	});

	it("passes custom variant prop", () => {
		render(<RefreshCollectionsButton variant="ghost" />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "ghost");
	});

	it("shows not pending state by default", () => {
		render(<RefreshCollectionsButton />);
		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-pending", "false");
	});
});
