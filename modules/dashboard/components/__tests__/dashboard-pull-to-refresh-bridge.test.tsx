import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockRefreshAction = vi.hoisted(() => vi.fn(() => Promise.resolve({ status: "success" })));
vi.mock("@/modules/dashboard/actions/refresh-dashboard", () => ({
	refreshDashboard: mockRefreshAction,
}));

// Keep the real event-name constant so the bridge subscribes to the same channel.
vi.mock("@/shared/components/pull-to-refresh", async () => {
	return {
		PULL_TO_REFRESH_EVENT: "admin:pull-to-refresh",
	};
});

import { DashboardPullToRefreshBridge } from "../dashboard-pull-to-refresh-bridge";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("DashboardPullToRefreshBridge", () => {
	it("registers a listener and calls refreshDashboard when the PTR event fires", async () => {
		render(<DashboardPullToRefreshBridge />);

		let waited: Promise<void> | undefined;
		const event = new CustomEvent("admin:pull-to-refresh", {
			detail: {
				waitFor: (p: Promise<void>) => {
					waited = p;
				},
			},
		});
		window.dispatchEvent(event);

		expect(mockRefreshAction).toHaveBeenCalledTimes(1);
		expect(waited).toBeInstanceOf(Promise);
		await waited;
	});

	it("unsubscribes on unmount (no leak)", () => {
		const { unmount } = render(<DashboardPullToRefreshBridge />);
		unmount();

		window.dispatchEvent(
			new CustomEvent("admin:pull-to-refresh", {
				detail: { waitFor: () => {} },
			}),
		);

		expect(mockRefreshAction).not.toHaveBeenCalled();
	});

	it("swallows action errors without blocking PTR", async () => {
		mockRefreshAction.mockRejectedValueOnce(new Error("rate-limited"));
		render(<DashboardPullToRefreshBridge />);

		let waited: Promise<void> | undefined;
		window.dispatchEvent(
			new CustomEvent("admin:pull-to-refresh", {
				detail: {
					waitFor: (p: Promise<void>) => {
						waited = p;
					},
				},
			}),
		);

		// Should resolve even though the underlying action rejected
		await expect(waited).resolves.toBeUndefined();
	});
});
