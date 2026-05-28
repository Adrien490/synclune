import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetClientIp = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetInvoiceProvider = vi.fn();
const mockProviderWebhookEventFindUnique = vi.fn();
const mockProviderWebhookEventUpsert = vi.fn();
const mockProviderWebhookEventUpdate = vi.fn();

vi.mock("next/headers", () => ({
	headers: async () => new Headers(),
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
	checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	PDP_WEBHOOK_LIMIT: { limit: 100, windowMs: 60_000 },
}));

vi.mock("@/modules/invoices/providers/factory", () => ({
	getInvoiceProvider: () => mockGetInvoiceProvider(),
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { FakePrismaError } = vi.hoisted(() => {
	class FakePrismaError extends Error {
		code: string;
		constructor(code: string) {
			super(`fake-${code}`);
			this.code = code;
		}
	}
	return { FakePrismaError };
});

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { PrismaClientKnownRequestError: FakePrismaError },
	ProviderWebhookEventStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		COMPLETED: "COMPLETED",
		FAILED: "FAILED",
		SKIPPED: "SKIPPED",
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		providerWebhookEvent: {
			findUnique: (...args: unknown[]) => mockProviderWebhookEventFindUnique(...args),
			upsert: (...args: unknown[]) => mockProviderWebhookEventUpsert(...args),
			update: (...args: unknown[]) => mockProviderWebhookEventUpdate(...args),
		},
	},
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: (
		cb: (scope: {
			setTag: () => void;
			setLevel: () => void;
			setFingerprint: () => void;
			setContext: () => void;
		}) => void,
	) => {
		cb({ setTag: vi.fn(), setLevel: vi.fn(), setFingerprint: vi.fn(), setContext: vi.fn() });
	},
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	startSpan: vi.fn((_, cb: () => unknown) => cb()),
}));

import { POST } from "../route";

function makeRequest(body: object): Request {
	return new Request("http://localhost/api/webhooks/pdp/mock", {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "content-type": "application/json" },
	});
}

describe("POST /api/webhooks/pdp/[providerId]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetClientIp.mockResolvedValue("1.2.3.4");
		mockCheckRateLimit.mockResolvedValue({ success: true });
	});

	it("returns 429 when rate-limited (before signature verify)", async () => {
		mockCheckRateLimit.mockResolvedValueOnce({ success: false, retryAfter: 30 });
		const res = await POST(makeRequest({}), { params: Promise.resolve({ providerId: "mock" }) });
		expect(res.status).toBe(429);
		expect(res.headers.get("Retry-After")).toBe("30");
		expect(mockGetInvoiceProvider).not.toHaveBeenCalled();
	});

	it("returns 503 when provider factory throws (misconfigured)", async () => {
		mockGetInvoiceProvider.mockImplementation(() => {
			throw new Error("Provider not implemented");
		});
		const res = await POST(makeRequest({}), { params: Promise.resolve({ providerId: "mock" }) });
		expect(res.status).toBe(503);
	});

	it("returns 404 when route providerId differs from active provider", async () => {
		mockGetInvoiceProvider.mockReturnValue({
			id: "chorus-pro",
			handleProviderWebhook: vi.fn(),
		});
		const res = await POST(makeRequest({}), {
			params: Promise.resolve({ providerId: "pdp-xxx" }),
		});
		expect(res.status).toBe(404);
	});

	it("returns 400 on invalid JSON", async () => {
		mockGetInvoiceProvider.mockReturnValue({ id: "mock", handleProviderWebhook: vi.fn() });
		const req = new Request("http://localhost/api/webhooks/pdp/mock", {
			method: "POST",
			body: "not-json{{",
		});
		const res = await POST(req, { params: Promise.resolve({ providerId: "mock" }) });
		expect(res.status).toBe(400);
	});

	it("returns 400 when provider.handleProviderWebhook throws (invalid signature)", async () => {
		mockGetInvoiceProvider.mockReturnValue({
			id: "mock",
			handleProviderWebhook: vi.fn().mockRejectedValue(new Error("bad signature")),
		});
		const res = await POST(makeRequest({ foo: 1 }), {
			params: Promise.resolve({ providerId: "mock" }),
		});
		expect(res.status).toBe(400);
	});

	it("returns 200 duplicate on replay of same event (idempotence)", async () => {
		mockGetInvoiceProvider.mockReturnValue({
			id: "mock",
			handleProviderWebhook: vi.fn().mockResolvedValue({
				eventType: "invoice.accepted",
				providerInvoiceId: "mock:F-2027-00042",
				status: "ACCEPTED",
				receivedAt: new Date(),
				rejectionReason: null,
			}),
		});
		mockProviderWebhookEventFindUnique.mockResolvedValueOnce({ id: "evt_1", status: "COMPLETED" });

		const res = await POST(makeRequest({ providerInvoiceId: "mock:F-2027-00042" }), {
			params: Promise.resolve({ providerId: "mock" }),
		});
		expect(res.status).toBe(200);
		const json = (await res.json()) as { received: boolean; status: string };
		expect(json.status).toBe("duplicate");
		expect(mockProviderWebhookEventUpsert).not.toHaveBeenCalled();
	});

	it("upserts PROCESSING then marks SKIPPED on first event (no handler wired)", async () => {
		mockGetInvoiceProvider.mockReturnValue({
			id: "mock",
			handleProviderWebhook: vi.fn().mockResolvedValue({
				eventType: "invoice.accepted",
				providerInvoiceId: "mock:F-2027-00042",
				status: "ACCEPTED",
				receivedAt: new Date(),
				rejectionReason: null,
			}),
		});
		mockProviderWebhookEventFindUnique.mockResolvedValueOnce(null);
		mockProviderWebhookEventUpsert.mockResolvedValueOnce({ id: "evt_new", attempts: 0 });
		mockProviderWebhookEventUpdate.mockResolvedValueOnce({});

		const res = await POST(makeRequest({ providerInvoiceId: "mock:F-2027-00042" }), {
			params: Promise.resolve({ providerId: "mock" }),
		});
		expect(res.status).toBe(200);
		const json = (await res.json()) as { received: boolean; status: string };
		expect(json.status).toBe("acknowledged");

		const updateCall = mockProviderWebhookEventUpdate.mock.calls[0]?.[0];
		expect(updateCall.data.status).toBe("SKIPPED");
		expect(updateCall.data.processedAt).toBeInstanceOf(Date);
	});

	it("returns 200 duplicate when upsert hits P2002 race", async () => {
		mockGetInvoiceProvider.mockReturnValue({
			id: "mock",
			handleProviderWebhook: vi.fn().mockResolvedValue({
				eventType: "invoice.accepted",
				providerInvoiceId: "mock:F-2027-00042",
				status: "ACCEPTED",
				receivedAt: new Date(),
				rejectionReason: null,
			}),
		});
		mockProviderWebhookEventFindUnique.mockResolvedValueOnce(null);
		mockProviderWebhookEventUpsert.mockRejectedValueOnce(new FakePrismaError("P2002"));

		const res = await POST(makeRequest({ providerInvoiceId: "mock:F-2027-00042" }), {
			params: Promise.resolve({ providerId: "mock" }),
		});
		expect(res.status).toBe(200);
		const json = (await res.json()) as { status: string };
		expect(json.status).toBe("duplicate");
	});
});
