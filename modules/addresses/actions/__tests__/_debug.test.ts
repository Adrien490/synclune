import { describe, it, expect, vi, beforeEach } from "vitest";

// Debug test to verify mock override behavior
const { mockFn } = vi.hoisted(() => ({
	mockFn: vi.fn(),
}));

describe("mock override debug", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFn.mockResolvedValue(2);
	});

	it("test A - default returns 2", async () => {
		const val = await mockFn();
		expect(val).toBe(2);
	});

	it("test B - override to 10 should work", async () => {
		mockFn.mockResolvedValue(10);
		const val = await mockFn();
		expect(val).toBe(10);
	});

	it("test C - another default test returns 2", async () => {
		const val = await mockFn();
		expect(val).toBe(2);
	});
});
