import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockGetSession,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockOrderFindFirst,
	mockHeaders,
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockCheckRateLimit: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockGetRateLimitIdentifier: vi.fn(),
	mockOrderFindFirst: vi.fn(),
	mockHeaders: vi.fn(),
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ORDER_LIMITS: {
		STATUS_POLL: { limit: 60, windowMs: 60_000 },
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { findFirst: mockOrderFindFirst } },
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

import { GET } from "../route";

// Valid cuid2: 24+ chars lowercase alphanumeric
const VALID_ORDER_ID = "kjlqzsfgwerthnvbcxmaqwer";

function makeRequest(orderId: string | null = VALID_ORDER_ID): Request {
	const url = orderId
		? `https://example.com/api/orders/ORD-1/status?orderId=${orderId}`
		: "https://example.com/api/orders/ORD-1/status";
	return new Request(url);
}

const makeParams = (orderNumber = "ORD-1") => ({
	params: Promise.resolve({ orderNumber }),
});

describe("GET /api/orders/[orderNumber]/status", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue(new Map());
		mockGetSession.mockResolvedValue(null);
		mockGetClientIp.mockResolvedValue("203.0.113.42");
		mockGetRateLimitIdentifier.mockReturnValue("ip:203.0.113.42");
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 59 });
	});

	it("returns 400 when orderId query param is missing/invalid", async () => {
		const res = await GET(makeRequest(null), makeParams());
		expect(res.status).toBe(400);
	});

	it("returns 400 when orderId is not a cuid2", async () => {
		const res = await GET(makeRequest("not-a-cuid"), makeParams());
		expect(res.status).toBe(400);
	});

	it("returns 429 when rate limit exceeded", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: false, error: "Too many", remaining: 0 });
		const res = await GET(makeRequest(), makeParams());
		expect(res.status).toBe(429);
		expect(res.headers.get("Retry-After")).toBe("60");
	});

	it("returns 404 when order is not found", async () => {
		mockOrderFindFirst.mockResolvedValue(null);
		const res = await GET(makeRequest(), makeParams());
		expect(res.status).toBe(404);
	});

	it("returns 404 when order belongs to a different authenticated user (IDOR guard)", async () => {
		mockOrderFindFirst.mockResolvedValue({
			paymentStatus: "PENDING",
			status: "PENDING",
			userId: "user_other",
		});
		mockGetSession.mockResolvedValue({ user: { id: "user_caller" } });

		const res = await GET(makeRequest(), makeParams());
		expect(res.status).toBe(404);
	});

	it("returns 200 with paymentStatus/status for guest order (userId null)", async () => {
		mockOrderFindFirst.mockResolvedValue({
			paymentStatus: "PENDING",
			status: "PENDING",
			userId: null,
		});

		const res = await GET(makeRequest(), makeParams());
		expect(res.status).toBe(200);
		expect(res.headers.get("Cache-Control")).toContain("no-store");
		const body = await res.json();
		expect(body).toEqual({ paymentStatus: "PENDING", status: "PENDING" });
	});

	it("returns 200 with PAID for owner-matched authenticated order", async () => {
		mockOrderFindFirst.mockResolvedValue({
			paymentStatus: "PAID",
			status: "PROCESSING",
			userId: "user_caller",
		});
		mockGetSession.mockResolvedValue({ user: { id: "user_caller" } });

		const res = await GET(makeRequest(), makeParams());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ paymentStatus: "PAID", status: "PROCESSING" });
	});

	it("looks up by (orderNumber, orderId) compound key", async () => {
		mockOrderFindFirst.mockResolvedValue({
			paymentStatus: "PENDING",
			status: "PENDING",
			userId: null,
		});

		await GET(makeRequest(), makeParams("SYN-2026-0042"));

		expect(mockOrderFindFirst).toHaveBeenCalledWith({
			where: { id: VALID_ORDER_ID, orderNumber: "SYN-2026-0042", deletedAt: null },
			select: { paymentStatus: true, status: true, userId: true },
		});
	});
});
