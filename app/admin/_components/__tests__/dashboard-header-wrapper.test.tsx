import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("../dashboard-header", () => ({
	DashboardHeader: () => <div data-testid="dashboard-header" />,
}));

import { DashboardHeaderWrapper } from "../dashboard-header-wrapper";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardHeaderWrapper", () => {
	it("renders DashboardHeader", () => {
		render(<DashboardHeaderWrapper />);
		expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
	});
});
