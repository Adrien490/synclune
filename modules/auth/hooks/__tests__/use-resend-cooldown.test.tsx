import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useResendCooldown } from "../use-resend-cooldown";

describe("useResendCooldown", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		window.sessionStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
		window.sessionStorage.clear();
	});

	it("returns no cooldown on first render (fresh sessionStorage)", () => {
		const { result } = renderHook(() => useResendCooldown({ storageKey: "test-cooldown" }));

		expect(result.current.isCoolingDown).toBe(false);
		expect(result.current.remainingSeconds).toBe(0);
	});

	it("starts a 60s cooldown and persists timestamp in sessionStorage", () => {
		const { result } = renderHook(() => useResendCooldown({ storageKey: "test-cooldown" }));

		act(() => {
			result.current.start();
		});

		expect(result.current.isCoolingDown).toBe(true);
		expect(result.current.remainingSeconds).toBeGreaterThan(58);
		expect(result.current.remainingSeconds).toBeLessThanOrEqual(60);
		expect(window.sessionStorage.getItem("test-cooldown")).toBeTruthy();
	});

	it("decrements every second during cooldown", () => {
		const { result } = renderHook(() => useResendCooldown({ storageKey: "test-cooldown" }));

		act(() => {
			result.current.start();
		});

		const initial = result.current.remainingSeconds;

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(result.current.remainingSeconds).toBeLessThan(initial);
		expect(result.current.remainingSeconds).toBeGreaterThanOrEqual(initial - 6);
	});

	it("exits cooldown once duration elapsed", () => {
		const { result } = renderHook(() =>
			useResendCooldown({ storageKey: "test-cooldown", cooldownMs: 2000 }),
		);

		act(() => {
			result.current.start();
		});

		expect(result.current.isCoolingDown).toBe(true);

		act(() => {
			vi.advanceTimersByTime(2100);
		});

		expect(result.current.isCoolingDown).toBe(false);
		expect(result.current.remainingSeconds).toBe(0);
	});

	it("restores remaining cooldown from sessionStorage on mount", () => {
		const now = Date.now();
		window.sessionStorage.setItem("test-cooldown", String(now - 30_000));

		const { result } = renderHook(() => useResendCooldown({ storageKey: "test-cooldown" }));

		expect(result.current.isCoolingDown).toBe(true);
		expect(result.current.remainingSeconds).toBeGreaterThan(28);
		expect(result.current.remainingSeconds).toBeLessThanOrEqual(30);
	});

	it("ignores stale sessionStorage older than cooldown window", () => {
		window.sessionStorage.setItem("test-cooldown", String(Date.now() - 120_000));

		const { result } = renderHook(() => useResendCooldown({ storageKey: "test-cooldown" }));

		expect(result.current.isCoolingDown).toBe(false);
		expect(result.current.remainingSeconds).toBe(0);
	});

	it("isolates cooldowns across different storage keys", () => {
		const { result: a } = renderHook(() => useResendCooldown({ storageKey: "form-a" }));
		const { result: b } = renderHook(() => useResendCooldown({ storageKey: "form-b" }));

		act(() => {
			a.current.start();
		});

		expect(a.current.isCoolingDown).toBe(true);
		expect(b.current.isCoolingDown).toBe(false);
	});
});
