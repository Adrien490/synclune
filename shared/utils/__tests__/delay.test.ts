import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { delay } from "../delay";

describe("delay", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("resolves after the specified duration", async () => {
		const promise = delay(1000);
		vi.advanceTimersByTime(1000);
		await expect(promise).resolves.toBeUndefined();
	});

	it("does not resolve before the duration", async () => {
		let resolved = false;
		void delay(500).then(() => {
			resolved = true;
		});

		vi.advanceTimersByTime(499);
		await Promise.resolve();
		expect(resolved).toBe(false);

		vi.advanceTimersByTime(1);
		await Promise.resolve();
		expect(resolved).toBe(true);
	});

	it("resolves immediately with 0ms", async () => {
		const promise = delay(0);
		vi.advanceTimersByTime(0);
		await expect(promise).resolves.toBeUndefined();
	});
});
