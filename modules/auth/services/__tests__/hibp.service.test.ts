import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";
import { checkPasswordBreached } from "../hibp.service";

describe("checkPasswordBreached", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("should use k-anonymity by only sending the 5-char hash prefix", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ABCDE:0\r\n"));

		await checkPasswordBreached("test-password");

		const sha1 = createHash("sha1").update("test-password").digest("hex").toUpperCase();
		const prefix = sha1.slice(0, 5);

		expect(fetchSpy).toHaveBeenCalledWith(
			`https://api.pwnedpasswords.com/range/${prefix}`,
			expect.objectContaining({
				headers: { "Add-Padding": "true" },
			}),
		);
	});

	it("should return breach count for a known breached password", async () => {
		const sha1 = createHash("sha1").update("password123").digest("hex").toUpperCase();
		const suffix = sha1.slice(5);

		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(`OTHER_HASH:10\r\n${suffix}:42\r\nANOTHER:3\r\n`),
		);

		const result = await checkPasswordBreached("password123");

		expect(result).toBe(42);
	});

	it("should return 0 for a safe password not in the list", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("AAAAA:5\r\nBBBBB:10\r\nCCCCC:1\r\n"),
		);

		const result = await checkPasswordBreached("my-very-unique-password-xyz-2026");

		expect(result).toBe(0);
	});

	it("should return 0 on network error (fail-open)", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

		const result = await checkPasswordBreached("any-password");

		expect(result).toBe(0);
	});

	it("should return 0 on timeout (fail-open)", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("Aborted", "AbortError"));

		const result = await checkPasswordBreached("any-password");

		expect(result).toBe(0);
	});

	it("should return 0 when API returns non-OK status", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("Service Unavailable", { status: 503 }),
		);

		const result = await checkPasswordBreached("any-password");

		expect(result).toBe(0);
	});

	it("should include Add-Padding header for privacy", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(""));

		await checkPasswordBreached("test");

		expect(fetchSpy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: { "Add-Padding": "true" },
			}),
		);
	});
});
