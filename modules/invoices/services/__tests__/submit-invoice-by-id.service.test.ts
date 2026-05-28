import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockLogger, mockProvider, mockSentry, mockPersistPdpTransmission, mockFetch } =
	vi.hoisted(() => ({
		mockPrisma: {
			order: {
				findUnique: vi.fn(),
			},
		},
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		mockProvider: {
			id: "mock-pa",
			capabilities: {
				submitInvoice: true,
				receiveInvoice: true,
				eReporting: true,
				directoryLookup: true,
			},
			submitInvoice: vi.fn(),
		},
		mockSentry: {
			withScope: vi.fn(
				(
					cb: (s: {
						setTag: typeof vi.fn;
						setFingerprint: typeof vi.fn;
						setLevel: typeof vi.fn;
					}) => void,
				) =>
					cb({
						setTag: vi.fn(),
						setFingerprint: vi.fn(),
						setLevel: vi.fn(),
					}),
			),
			captureException: vi.fn(),
			captureMessage: vi.fn(),
			addBreadcrumb: vi.fn(),
			startSpan: vi.fn((_: unknown, fn: (s: unknown) => unknown) => fn({ setAttribute: vi.fn() })),
		},
		mockPersistPdpTransmission: vi.fn(),
		mockFetch: vi.fn(),
	}));

vi.mock("@sentry/nextjs", () => mockSentry);
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/modules/invoices/providers/factory", () => ({
	getInvoiceProvider: () => mockProvider,
}));
vi.mock("@/modules/orders/services/persist-pdp-transmission.service", () => ({
	persistPdpTransmission: mockPersistPdpTransmission,
}));

import { submitInvoiceById } from "../submit-invoice-by-id.service";

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		invoiceNumber: "F-2026-00001",
		invoiceDataSnapshot: { invoiceNumber: "F-2026-00001" } as Record<string, unknown>,
		invoicePdfUrl: "https://uploadthing.example.com/pdf-1",
		invoiceXmlUrl: "https://uploadthing.example.com/xml-1",
		pdpStatus: null,
		pdpProviderRef: null,
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	// Provide a default fetch mock that resolves to an empty ArrayBuffer.
	mockFetch.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) });
	vi.stubGlobal("fetch", mockFetch);
	// Default capabilities re-enabled (tests can override).
	mockProvider.capabilities = {
		submitInvoice: true,
		receiveInvoice: true,
		eReporting: true,
		directoryLookup: true,
	};
});

describe("submitInvoiceById — capability gate", () => {
	it("returns SKIPPED_CAPABILITY_OFF when provider has no submitInvoice capability (no DB query)", async () => {
		mockProvider.capabilities = {
			submitInvoice: false,
			receiveInvoice: false,
			eReporting: false,
			directoryLookup: false,
		};
		const result = await submitInvoiceById("order-1");
		expect(result.status).toBe("SKIPPED_CAPABILITY_OFF");
		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
	});
});

describe("submitInvoiceById — early returns", () => {
	it("returns ORDER_NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await submitInvoiceById("missing");
		expect(result.status).toBe("ORDER_NOT_FOUND");
		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
	});

	it("returns NOT_INVOICED when invoiceNumber is null", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder({ invoiceNumber: null }));
		const result = await submitInvoiceById("order-1");
		expect(result.status).toBe("NOT_INVOICED");
		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
	});

	it("returns NO_INVOICE_DATA_SNAPSHOT when snapshot is null", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder({ invoiceDataSnapshot: null }));
		const result = await submitInvoiceById("order-1");
		expect(result.status).toBe("NO_INVOICE_DATA_SNAPSHOT");
		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
	});

	it("returns ALREADY_SENT when pdpProviderRef is set and pdpStatus=SENT", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			makeOrder({ pdpProviderRef: "ref-123", pdpStatus: "SENT" }),
		);
		const result = await submitInvoiceById("order-1");
		expect(result.status).toBe("ALREADY_SENT");
		expect(result.providerInvoiceId).toBe("ref-123");
		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
	});

	it("returns ALREADY_SENT when pdpStatus=ACCEPTED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			makeOrder({ pdpProviderRef: "ref-456", pdpStatus: "ACCEPTED" }),
		);
		const result = await submitInvoiceById("order-1");
		expect(result.status).toBe("ALREADY_SENT");
	});

	it("does NOT short-circuit when pdpStatus=REJECTED (retry allowed)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			makeOrder({ pdpProviderRef: "ref-old", pdpStatus: "REJECTED" }),
		);
		mockProvider.submitInvoice.mockResolvedValue({
			providerInvoiceId: "ref-new",
			status: "SUBMITTED",
			submittedAt: new Date(),
		});
		const result = await submitInvoiceById("order-1");
		expect(result.status).toBe("SUBMITTED");
		expect(mockProvider.submitInvoice).toHaveBeenCalled();
	});
});

describe("submitInvoiceById — success path", () => {
	it("submits invoice and persists via persistPdpTransmission", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
		mockProvider.submitInvoice.mockResolvedValue({
			providerInvoiceId: "pa-invoice-001",
			status: "SUBMITTED",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
		});

		const result = await submitInvoiceById("order-1");

		expect(result.status).toBe("SUBMITTED");
		expect(result.providerInvoiceId).toBe("pa-invoice-001");
		expect(mockProvider.submitInvoice).toHaveBeenCalledWith(
			expect.objectContaining({
				invoiceData: expect.objectContaining({ invoiceNumber: "F-2026-00001" }),
				pdfBuffer: expect.any(ArrayBuffer),
				xmlBuffer: expect.any(ArrayBuffer),
			}),
		);
		expect(mockPersistPdpTransmission).toHaveBeenCalledWith({
			orderId: "order-1",
			providerName: "mock-pa",
			result: expect.objectContaining({
				providerInvoiceId: "pa-invoice-001",
				status: "SUBMITTED",
			}),
		});
	});

	it("passes null xmlBuffer when invoiceXmlUrl is null", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder({ invoiceXmlUrl: null }));
		mockProvider.submitInvoice.mockResolvedValue({
			providerInvoiceId: "pa-invoice-002",
			status: "SUBMITTED",
			submittedAt: new Date(),
		});

		await submitInvoiceById("order-1");

		expect(mockProvider.submitInvoice).toHaveBeenCalledWith(
			expect.objectContaining({
				pdfBuffer: expect.any(ArrayBuffer),
				xmlBuffer: null,
			}),
		);
	});

	it("returns REJECTED when provider returns REJECTED synchronously (persist still called)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
		mockProvider.submitInvoice.mockResolvedValue({
			providerInvoiceId: "pa-invoice-003",
			status: "REJECTED",
			submittedAt: new Date(),
		});

		const result = await submitInvoiceById("order-1");

		expect(result.status).toBe("REJECTED");
		expect(result.providerInvoiceId).toBe("pa-invoice-003");
		expect(mockPersistPdpTransmission).toHaveBeenCalled();
	});
});

describe("submitInvoiceById — failure path", () => {
	it("provider throws → REJECTED + persistPdpTransmission with stable error ref + Sentry capture", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
		mockProvider.submitInvoice.mockRejectedValue(new Error("ECONNRESET"));

		const result = await submitInvoiceById("order-1");

		expect(result.status).toBe("REJECTED");
		expect(result.errorMessage).toBe("ECONNRESET");
		expect(mockPersistPdpTransmission).toHaveBeenCalledWith({
			orderId: "order-1",
			providerName: "mock-pa",
			result: expect.objectContaining({
				providerInvoiceId: "error:order-1",
				status: "REJECTED",
			}),
			errorCode: "PROVIDER_THROW",
			errorMessage: "ECONNRESET",
		});
		expect(mockSentry.captureException).toHaveBeenCalled();
	});

	it("PDF fetch fails → REJECTED with errorCode=ARTIFACT_FETCH_FAILED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
		mockFetch.mockRejectedValueOnce(new Error("HTTP 503 UploadThing down"));

		const result = await submitInvoiceById("order-1");

		expect(result.status).toBe("REJECTED");
		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
		expect(mockPersistPdpTransmission).toHaveBeenCalledWith(
			expect.objectContaining({
				errorCode: "ARTIFACT_FETCH_FAILED",
				errorMessage: expect.stringContaining("UploadThing down"),
			}),
		);
	});

	it("truncates errorMessage longer than 1000 chars passed to persist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
		const longMessage = "X".repeat(2000);
		mockProvider.submitInvoice.mockRejectedValue(new Error(longMessage));

		await submitInvoiceById("order-1");

		const persistCall = mockPersistPdpTransmission.mock.calls[0]?.[0] as {
			errorMessage?: string;
		};
		expect(persistCall.errorMessage?.length).toBe(1000);
	});
});

describe("submitInvoiceById — idempotence", () => {
	it("2 successive calls : 1st SUBMITTED + persists, 2nd ALREADY_SENT (no provider call)", async () => {
		// 1st call : pdpStatus null → submit happens
		mockPrisma.order.findUnique.mockResolvedValueOnce(makeOrder());
		mockProvider.submitInvoice.mockResolvedValue({
			providerInvoiceId: "pa-invoice-idem",
			status: "SUBMITTED",
			submittedAt: new Date(),
		});

		const first = await submitInvoiceById("order-1");
		expect(first.status).toBe("SUBMITTED");

		// 2nd call : pdpStatus=SENT + pdpProviderRef set → short-circuit
		mockPrisma.order.findUnique.mockResolvedValueOnce(
			makeOrder({ pdpStatus: "SENT", pdpProviderRef: "pa-invoice-idem" }),
		);
		mockProvider.submitInvoice.mockClear();

		const second = await submitInvoiceById("order-1");
		expect(second.status).toBe("ALREADY_SENT");
		expect(second.providerInvoiceId).toBe("pa-invoice-idem");
		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
	});
});
