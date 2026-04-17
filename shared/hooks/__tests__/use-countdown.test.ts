import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCountdown } from "../use-countdown";

describe("useCountdown", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-17T10:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns null when endDate is null or undefined", () => {
		const { result: nullResult } = renderHook(() => useCountdown(null));
		expect(nullResult.current).toBeNull();

		const { result: undefResult } = renderHook(() => useCountdown(undefined));
		expect(undefResult.current).toBeNull();
	});

	it("returns null when endDate is an invalid date string", () => {
		const { result } = renderHook(() => useCountdown("not-a-date"));
		expect(result.current).toBeNull();
	});

	it("computes an initial snapshot for a future endDate (days + hours + minutes)", () => {
		// 2 days, 3 hours, 45 minutes from now
		const target = new Date("2026-04-19T13:45:00.000Z");
		const { result } = renderHook(() => useCountdown(target));

		expect(result.current).not.toBeNull();
		expect(result.current?.days).toBe(2);
		expect(result.current?.hours).toBe(3);
		expect(result.current?.minutes).toBe(45);
		expect(result.current?.isExpired).toBe(false);
	});

	it("ticks every minute and decreases minutes field", () => {
		const target = new Date("2026-04-17T11:00:00.000Z"); // 1 hour from now
		const { result } = renderHook(() => useCountdown(target));

		expect(result.current?.minutes).toBe(0);
		expect(result.current?.hours).toBe(1);

		act(() => {
			vi.advanceTimersByTime(60_000);
		});

		expect(result.current?.hours).toBe(0);
		expect(result.current?.minutes).toBe(59);
	});

	it("marks snapshot as expired when endDate has passed", () => {
		const past = new Date("2026-04-17T09:59:00.000Z"); // 1 min ago
		const { result } = renderHook(() => useCountdown(past));
		expect(result.current?.isExpired).toBe(true);
		expect(result.current?.totalMs).toBe(0);
	});

	it("clears the interval once countdown expires", () => {
		const target = new Date("2026-04-17T10:00:30.000Z"); // 30s → expires on first tick
		const { result } = renderHook(() => useCountdown(target));
		expect(result.current?.isExpired).toBe(false);

		act(() => {
			vi.advanceTimersByTime(60_000);
		});
		expect(result.current?.isExpired).toBe(true);

		// Further ticks should not throw — interval cleared
		act(() => {
			vi.advanceTimersByTime(60_000 * 5);
		});
		expect(result.current?.isExpired).toBe(true);
	});

	it("cleans up the interval on unmount", () => {
		const target = new Date("2026-04-17T11:00:00.000Z");
		const { unmount } = renderHook(() => useCountdown(target));
		expect(vi.getTimerCount()).toBeGreaterThan(0);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});
