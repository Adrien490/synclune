import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useCountdown } from "../use-countdown";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

describe("useCountdown (announcement-bar)", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-17T10:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns null when target is null", () => {
		const { result } = renderHook(() => useCountdown(null, ONE_DAY_MS));
		expect(result.current).toBeNull();
	});

	it("returns null when target is undefined", () => {
		const { result } = renderHook(() => useCountdown(undefined, ONE_DAY_MS));
		expect(result.current).toBeNull();
	});

	it("returns null when target is in the past", () => {
		const past = new Date(Date.now() - ONE_HOUR_MS);
		const { result } = renderHook(() => useCountdown(past, ONE_DAY_MS));
		expect(result.current).toBeNull();
	});

	it("returns null when target is beyond display threshold", () => {
		const farFuture = new Date(Date.now() + 2 * ONE_DAY_MS);
		const { result } = renderHook(() => useCountdown(farFuture, ONE_DAY_MS));
		expect(result.current).toBeNull();
	});

	it("returns a HH:MM:SS label when target is within threshold and >= 1h away", () => {
		const target = new Date(Date.now() + (3 * 60 * 60 + 25 * 60 + 12) * 1000);
		const { result } = renderHook(() => useCountdown(target, ONE_DAY_MS));
		expect(result.current?.label).toBe("03:25:12");
	});

	it("returns a MM:SS label when target is less than 1h away", () => {
		const target = new Date(Date.now() + (12 * 60 + 5) * 1000);
		const { result } = renderHook(() => useCountdown(target, ONE_DAY_MS));
		expect(result.current?.label).toBe("12:05");
	});

	it("ticks every second", () => {
		const target = new Date(Date.now() + 5 * 1000);
		const { result } = renderHook(() => useCountdown(target, ONE_DAY_MS));

		expect(result.current?.label).toBe("00:05");
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(result.current?.label).toBe("00:04");
	});

	it("returns null after target is reached", () => {
		const target = new Date(Date.now() + 2 * 1000);
		const { result } = renderHook(() => useCountdown(target, ONE_DAY_MS));

		expect(result.current).not.toBeNull();
		act(() => {
			vi.advanceTimersByTime(3 * 1000);
		});
		expect(result.current).toBeNull();
	});

	it("handles invalid date strings by returning null", () => {
		const { result } = renderHook(() => useCountdown("not-a-date", ONE_DAY_MS));
		expect(result.current).toBeNull();
	});
});
