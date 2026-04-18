import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: mockRefresh }),
}));

import { StoreReopenCountdown } from "../store-reopen-countdown";

describe("StoreReopenCountdown", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-18T10:00:00Z"));
		mockRefresh.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders nothing when target date is in the past (expired)", () => {
		const past = new Date("2026-04-18T09:00:00Z");
		const { container } = render(<StoreReopenCountdown reopensAt={past} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders countdown with role=timer and aria-live=off when future", () => {
		const future = new Date("2026-04-18T13:30:00Z"); // +3h30
		render(<StoreReopenCountdown reopensAt={future} />);

		const timer = screen.getByRole("timer");
		expect(timer).toHaveAttribute("aria-live", "off");
		expect(timer.textContent).toMatch(/3 heures et 30 minutes/);
	});

	it("formats remaining as days when more than 1 day", () => {
		const future = new Date("2026-04-21T15:00:00Z"); // +3 days +5h
		render(<StoreReopenCountdown reopensAt={future} />);
		const timer = screen.getByRole("timer");
		expect(timer.textContent).toMatch(/3 jours et 5 heures/);
	});

	it("formats remaining as minutes when less than 1 hour", () => {
		const future = new Date("2026-04-18T10:25:00Z"); // +25min
		render(<StoreReopenCountdown reopensAt={future} />);
		const timer = screen.getByRole("timer");
		expect(timer.textContent).toMatch(/25 minutes/);
	});

	it("calls router.refresh when countdown expires", async () => {
		const justAhead = new Date("2026-04-18T10:00:30Z"); // +30s, will expire after tick
		render(<StoreReopenCountdown reopensAt={justAhead} />);

		// Advance past expiry. Hook ticks every minute, so advance well past target.
		await act(async () => {
			vi.advanceTimersByTime(120_000);
		});

		expect(mockRefresh).toHaveBeenCalledTimes(1);
	});
});
