import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("../relative-clock", () => ({
	RelativeClock: ({ from, paused }: { from: Date | null; paused: boolean }) => (
		<span
			data-testid="relative-clock"
			data-from={from?.toISOString() ?? "null"}
			data-paused={paused ? "true" : "false"}
		>
			il y a 0 s
		</span>
	),
}));

vi.mock("@/modules/dashboard/hooks/use-refresh-dashboard", () => ({
	DASHBOARD_REFRESHED_EVENT: "dashboard:refreshed",
}));

import { DashboardFreshness } from "../dashboard-freshness";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardFreshness", () => {
	it("renders 'Affiché' prefix and the relative clock", () => {
		render(<DashboardFreshness />);
		expect(screen.getByText(/affiché/i)).toBeInTheDocument();
		expect(screen.getByTestId("relative-clock")).toBeInTheDocument();
	});

	it("anchors the relative clock to a Date (mount time) and unpauses it", () => {
		render(<DashboardFreshness />);
		const clock = screen.getByTestId("relative-clock");
		expect(clock.getAttribute("data-from")).not.toBe("null");
		expect(clock.getAttribute("data-paused")).toBe("false");
	});

	it("does NOT use aria-live (would re-announce every second tick — SR noise)", () => {
		render(<DashboardFreshness />);
		const region = screen.getByText(/affiché/i).closest("p");
		expect(region).not.toHaveAttribute("aria-live");
	});

	it("forwards className for responsive visibility (e.g. md:hidden)", () => {
		render(<DashboardFreshness className="md:hidden" />);
		const region = screen.getByText(/affiché/i).closest("p");
		expect(region?.className).toContain("md:hidden");
	});

	it("includes the pulse dot decoration", () => {
		render(<DashboardFreshness />);
		const region = screen.getByText(/affiché/i).closest("p");
		const dot = region?.querySelector('[aria-hidden="true"]');
		expect(dot).toBeInTheDocument();
		expect(dot?.className).toContain("bg-success/60");
		expect(dot?.className).toContain("motion-safe:animate-pulse");
	});

	it("resets mountedAt when 'dashboard:refreshed' event fires", async () => {
		vi.useFakeTimers();
		const initial = new Date("2026-05-14T10:00:00.000Z");
		vi.setSystemTime(initial);

		render(<DashboardFreshness />);
		const initialFrom = screen.getByTestId("relative-clock").getAttribute("data-from");
		expect(initialFrom).toBe(initial.toISOString());

		const later = new Date("2026-05-14T10:05:00.000Z");
		vi.setSystemTime(later);
		act(() => {
			window.dispatchEvent(new CustomEvent("dashboard:refreshed"));
		});

		const updatedFrom = screen.getByTestId("relative-clock").getAttribute("data-from");
		expect(updatedFrom).toBe(later.toISOString());

		vi.useRealTimers();
	});

	it("resets mountedAt when 'admin:pull-to-refresh' event fires", async () => {
		vi.useFakeTimers();
		const initial = new Date("2026-05-14T11:00:00.000Z");
		vi.setSystemTime(initial);

		render(<DashboardFreshness />);
		const later = new Date("2026-05-14T11:02:00.000Z");
		vi.setSystemTime(later);
		act(() => {
			window.dispatchEvent(new CustomEvent("admin:pull-to-refresh"));
		});

		expect(screen.getByTestId("relative-clock").getAttribute("data-from")).toBe(
			later.toISOString(),
		);

		vi.useRealTimers();
	});
});
