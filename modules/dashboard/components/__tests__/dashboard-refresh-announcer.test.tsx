import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.hoisted(() => vi.fn((_key: string): string | null => null));
vi.mock("next/navigation", () => ({
	useSearchParams: () => ({ get: mockGet }),
}));

import { DashboardRefreshAnnouncer } from "../dashboard-refresh-announcer";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("DashboardRefreshAnnouncer", () => {
	it("renders an sr-only status region with aria-live='polite'", () => {
		render(<DashboardRefreshAnnouncer />);
		const region = screen.getByRole("status");
		expect(region).toHaveAttribute("aria-live", "polite");
		expect(region).toHaveAttribute("aria-atomic", "true");
		expect(region.className).toContain("sr-only");
	});

	it("is silent on first render (no announcement)", () => {
		mockGet.mockReturnValue(null);
		render(<DashboardRefreshAnnouncer />);
		const region = screen.getByRole("status");
		expect(region.textContent).toBe("");
	});

	it("announces the resolved period + comparison label after a search-param change", async () => {
		mockGet.mockImplementation((key: string) => {
			if (key === "period") return "7d";
			if (key === "comparison") return "yoy";
			return null;
		});

		const { rerender } = render(<DashboardRefreshAnnouncer />);
		// First render registers the initial value; second simulates a URL change (period already at 7d).
		mockGet.mockImplementation((key: string) => {
			if (key === "period") return "month";
			if (key === "comparison") return "yoy";
			return null;
		});
		rerender(<DashboardRefreshAnnouncer />);

		const region = screen.getByRole("status");
		expect(region.textContent).toMatch(/Données du tableau de bord chargées/);
		expect(region.textContent).toMatch(/Ce mois/);
		expect(region.textContent).toMatch(/Année précédente/);
	});
});
