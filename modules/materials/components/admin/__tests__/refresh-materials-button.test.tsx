import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefresh, capturedProps } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
	capturedProps: { current: null as Record<string, unknown> | null },
}));

vi.mock("@/modules/materials/hooks/use-refresh-materials", () => ({
	useRefreshMaterials: () => ({ refresh: mockRefresh, isPending: false }),
}));

vi.mock("@/shared/components/refresh-button", () => ({
	RefreshButton: (props: Record<string, unknown>) => {
		capturedProps.current = props;
		return (
			<button
				data-testid="refresh-button"
				aria-label={props.label as string}
				onClick={props.onRefresh as () => void}
				disabled={props.isPending as boolean}
			>
				{props.label as string}
			</button>
		);
	},
}));

import { RefreshMaterialsButton } from "../refresh-materials-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("RefreshMaterialsButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedProps.current = null;
	});

	it("renders the RefreshButton", () => {
		render(<RefreshMaterialsButton />);
		expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
	});

	it("passes label 'Rafraîchir les matériaux' to RefreshButton", () => {
		render(<RefreshMaterialsButton />);
		expect(capturedProps.current?.label).toBe("Rafraîchir les matériaux");
	});

	it("passes the refresh function as onRefresh prop", () => {
		render(<RefreshMaterialsButton />);
		expect(capturedProps.current?.onRefresh).toBe(mockRefresh);
	});

	it("passes isPending false to RefreshButton when not pending", () => {
		render(<RefreshMaterialsButton />);
		expect(capturedProps.current?.isPending).toBe(false);
	});

	it("shows label text in rendered button", () => {
		render(<RefreshMaterialsButton />);
		expect(screen.getByText("Rafraîchir les matériaux")).toBeInTheDocument();
	});
});
