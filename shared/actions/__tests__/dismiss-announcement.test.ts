import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

const { mockCookieSet, mockHeaders, mockGetClientIp, mockEnforceRateLimit } = vi.hoisted(() => ({
	mockCookieSet: vi.fn(),
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
}));

vi.mock("next/headers", () => ({
	cookies: async () => ({ set: mockCookieSet }),
	headers: mockHeaders,
}));
vi.mock("@/shared/lib/rate-limit", () => ({
	getClientIp: mockGetClientIp,
}));
vi.mock("@/shared/lib/actions/rate-limit", () => ({
	enforceRateLimit: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	PUBLIC_ANNOUNCEMENT_DISMISS_LIMIT: "dismiss-limit",
}));

import { dismissAnnouncement } from "../dismiss-announcement";

function makeForm(hash: string | null) {
	const fd = new FormData();
	if (hash !== null) fd.append("hash", hash);
	return fd;
}

describe("dismissAnnouncement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue({});
		mockGetClientIp.mockResolvedValue("1.2.3.4");
		mockEnforceRateLimit.mockResolvedValue({});
	});

	it("sets a cookie keyed by the validated 16-char hash with 24h TTL", async () => {
		const result = await dismissAnnouncement(undefined, makeForm("abcdef0123456789"));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockCookieSet).toHaveBeenCalledWith(
			"announcement_dismissed_abcdef0123456789",
			"1",
			expect.objectContaining({
				httpOnly: true,
				sameSite: "strict",
				path: "/",
				maxAge: 24 * 60 * 60,
			}),
		);
	});

	it("rejects hashes that are not 16 hex chars", async () => {
		const badHashes = ["tooshort", "ZZZZZZZZZZZZZZZZ", "abc123", "a".repeat(17)];
		for (const bad of badHashes) {
			mockCookieSet.mockClear();
			const result = await dismissAnnouncement(undefined, makeForm(bad));
			expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
			expect(mockCookieSet).not.toHaveBeenCalled();
		}
	});

	it("returns rate-limit error without setting cookie", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Slow down" },
		});
		const result = await dismissAnnouncement(undefined, makeForm("abcdef0123456789"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockCookieSet).not.toHaveBeenCalled();
	});

	it("falls back to 'unknown' IP when client IP is null", async () => {
		mockGetClientIp.mockResolvedValue(null);
		await dismissAnnouncement(undefined, makeForm("abcdef0123456789"));
		expect(mockEnforceRateLimit).toHaveBeenCalledWith(
			"announcement-dismiss:unknown",
			"dismiss-limit",
			"unknown",
		);
	});
});
