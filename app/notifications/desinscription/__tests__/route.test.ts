import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockCheckRateLimit,
	mockGetClientIp,
	mockHeaders,
	mockVerifyToken,
	mockLoggerWarn,
	mockLoggerError,
	mockCaptureMessage,
	mockUserUpdateMany,
} = vi.hoisted(() => ({
	mockCheckRateLimit: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockHeaders: vi.fn(),
	mockVerifyToken: vi.fn(),
	mockLoggerWarn: vi.fn(),
	mockLoggerError: vi.fn(),
	mockCaptureMessage: vi.fn(),
	mockUserUpdateMany: vi.fn(),
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/modules/notifications/utils/unsubscribe-token", () => ({
	verifyUnsubscribeToken: mockVerifyToken,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { warn: mockLoggerWarn, error: mockLoggerError },
}));

vi.mock("@sentry/nextjs", () => ({
	captureMessage: mockCaptureMessage,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { user: { updateMany: mockUserUpdateMany } },
}));

import { GET, POST } from "../route";

// ============================================================================
// Helpers
// ============================================================================

function makeGet(query = "?email=jane@example.com&token=abc"): NextRequest {
	return new Request(
		`https://synclune.fr/notifications/desinscription${query}`,
	) as unknown as NextRequest;
}

function makePost(): NextRequest {
	const fd = new FormData();
	fd.set("email", "jane@example.com");
	fd.set("token", "abc");
	return new Request("https://synclune.fr/notifications/desinscription", {
		method: "POST",
		body: fd,
	}) as unknown as NextRequest;
}

// ============================================================================
// Tests — RATE-AUDIT-003
// ============================================================================

describe("/notifications/desinscription — rate limiting (RATE-AUDIT-003)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue(new Map());
		mockGetClientIp.mockResolvedValue("203.0.113.42");
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 19 });
		mockVerifyToken.mockReturnValue(true);
		mockUserUpdateMany.mockResolvedValue({ count: 1 });
	});

	it("uses unsubscribe:<ip> as the rate-limit key with 20/min", async () => {
		await GET(makeGet());

		expect(mockCheckRateLimit).toHaveBeenCalledWith(
			"unsubscribe:203.0.113.42",
			expect.objectContaining({ limit: 20, windowMs: 60_000 }),
			"203.0.113.42",
		);
	});

	it("falls back to unsubscribe:unknown when client IP is null", async () => {
		mockGetClientIp.mockResolvedValue(null);

		await GET(makeGet());

		expect(mockCheckRateLimit).toHaveBeenCalledWith(
			"unsubscribe:unknown",
			expect.anything(),
			undefined,
		);
	});

	it("GET returns 429 with Retry-After when rate limited, without verifying token", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0, retryAfter: 42 });

		const res = await GET(makeGet());

		expect(res.status).toBe(429);
		expect(res.headers.get("Retry-After")).toBe("42");
		expect(mockVerifyToken).not.toHaveBeenCalled();
		expect(mockCaptureMessage).not.toHaveBeenCalled();
		expect(mockLoggerWarn).not.toHaveBeenCalled();
	});

	it("POST returns 429 with Retry-After when rate limited, without recording opt-out", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: false, remaining: 0 });

		const res = await POST(makePost());

		expect(res.status).toBe(429);
		expect(res.headers.get("Retry-After")).toBe("60"); // fallback
		expect(mockVerifyToken).not.toHaveBeenCalled();
		expect(mockCaptureMessage).not.toHaveBeenCalled();
		expect(mockLoggerWarn).not.toHaveBeenCalled();
	});

	it("processes the request normally (records opt-out) when under the limit", async () => {
		const res = await GET(makeGet());

		expect(res.status).toBe(200);
		expect(mockVerifyToken).toHaveBeenCalledWith("jane@example.com", "abc");
		expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
		expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// Tests — persistance opposition marketing (RGPD-AUDIT P1-1, Art. 21(3))
// ============================================================================

describe("/notifications/desinscription — persistance opt-out (RGPD-AUDIT P1-1)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue(new Map());
		mockGetClientIp.mockResolvedValue("203.0.113.42");
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 19 });
		mockVerifyToken.mockReturnValue(true);
		mockUserUpdateMany.mockResolvedValue({ count: 1 });
	});

	it("GET persists marketingOptOutAt for the verified email", async () => {
		await GET(makeGet());

		expect(mockUserUpdateMany).toHaveBeenCalledWith({
			where: { email: { equals: "jane@example.com", mode: "insensitive" } },
			data: { marketingOptOutAt: expect.any(Date) },
		});
	});

	it("POST (RFC 8058 One-Click) persists marketingOptOutAt too", async () => {
		const res = await POST(makePost());

		expect(res.status).toBe(200);
		expect(mockUserUpdateMany).toHaveBeenCalledWith({
			where: { email: { equals: "jane@example.com", mode: "insensitive" } },
			data: { marketingOptOutAt: expect.any(Date) },
		});
	});

	it("does NOT touch the DB when the token is invalid", async () => {
		mockVerifyToken.mockReturnValue(false);

		const res = await GET(makeGet());

		expect(res.status).toBe(400);
		expect(mockUserUpdateMany).not.toHaveBeenCalled();
	});

	it("still confirms to the user (200) and logs when the DB write fails", async () => {
		mockUserUpdateMany.mockRejectedValue(new Error("db down"));

		const res = await GET(makeGet());

		expect(res.status).toBe(200);
		expect(mockLoggerError).toHaveBeenCalledTimes(1);
		// Signal secondaire (log + Sentry) toujours émis pour propagation manuelle.
		expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
		expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
	});
});
