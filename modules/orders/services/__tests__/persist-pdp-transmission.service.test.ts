import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOrderFindUnique = vi.fn();
const mockOrderUpdate = vi.fn();
const mockOrderHistoryCreate = vi.fn();
const mockTransmissionLogCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
			update: (...args: unknown[]) => mockOrderUpdate(...args),
		},
		orderHistory: {
			create: (...args: unknown[]) => mockOrderHistoryCreate(...args),
		},
		invoiceTransmissionLog: {
			create: (...args: unknown[]) => mockTransmissionLogCreate(...args),
		},
		$transaction: (...args: unknown[]) => mockTransaction(...args),
	},
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { persistPdpTransmission } from "../persist-pdp-transmission.service";

function setupTransactionMock() {
	mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
		await cb({
			order: {
				findUnique: mockOrderFindUnique,
				update: mockOrderUpdate,
			},
			orderHistory: {
				create: mockOrderHistoryCreate,
			},
			invoiceTransmissionLog: {
				create: mockTransmissionLogCreate,
			},
		});
	});
}

describe("persistPdpTransmission", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupTransactionMock();
	});

	it("returns ORDER_NOT_FOUND when no order matches", async () => {
		mockOrderFindUnique.mockResolvedValueOnce(null);

		const result = await persistPdpTransmission({
			orderId: "ord_nope",
			providerName: "mock",
			result: {
				providerInvoiceId: "mock:F-2027-00001",
				status: "SUBMITTED",
				submittedAt: new Date(),
			},
		});

		expect(result.status).toBe("ORDER_NOT_FOUND");
		expect(mockOrderUpdate).not.toHaveBeenCalled();
		expect(mockOrderHistoryCreate).not.toHaveBeenCalled();
		expect(mockTransmissionLogCreate).not.toHaveBeenCalled();
	});

	it("returns ALREADY_SET when same providerInvoiceId+status already persisted (idempotent)", async () => {
		mockOrderFindUnique.mockResolvedValueOnce({
			invoiceNumber: "F-2027-00001",
			pdpStatus: "SENT",
			pdpProviderRef: "mock:F-2027-00001",
			pdpRetryCount: 0,
		});

		const result = await persistPdpTransmission({
			orderId: "ord_42",
			providerName: "mock",
			result: {
				providerInvoiceId: "mock:F-2027-00001",
				status: "SUBMITTED", // → SENT après mapping
				submittedAt: new Date(),
			},
		});

		expect(result.status).toBe("ALREADY_SET");
		expect(mockTransaction).not.toHaveBeenCalled();
	});

	it("persists SUBMITTED with PDP_SUBMITTED audit + OUTBOUND SUCCESS log", async () => {
		const submittedAt = new Date("2027-01-15T10:00:00Z");
		mockOrderFindUnique
			.mockResolvedValueOnce({
				invoiceNumber: "F-2027-00042",
				pdpStatus: null,
				pdpProviderRef: null,
				pdpRetryCount: 0,
			})
			.mockResolvedValueOnce({
				pdpProviderRef: null,
				pdpStatus: null,
			});

		const result = await persistPdpTransmission({
			orderId: "ord_42",
			providerName: "chorus-pro",
			result: {
				providerInvoiceId: "chorus:abc123",
				status: "SUBMITTED",
				submittedAt,
			},
		});

		expect(result.status).toBe("PERSISTED");
		expect(result.pdpStatus).toBe("SENT");
		expect(result.pdpProviderRef).toBe("chorus:abc123");

		const updateCall = mockOrderUpdate.mock.calls[0]?.[0];
		expect(updateCall.where).toEqual({ id: "ord_42" });
		expect(updateCall.data.pdpStatus).toBe("SENT");
		expect(updateCall.data.pdpProviderRef).toBe("chorus:abc123");
		expect(updateCall.data.pdpProviderName).toBe("chorus-pro");
		expect(updateCall.data.pdpTransmittedAt).toBe(submittedAt);
		expect(updateCall.data.pdpAcceptedAt).toBeUndefined();

		const historyCall = mockOrderHistoryCreate.mock.calls[0]?.[0];
		expect(historyCall.data.action).toBe("PDP_SUBMITTED");
		expect(historyCall.data.source).toBe("SYSTEM");
		expect(historyCall.data.metadata.providerInvoiceId).toBe("chorus:abc123");

		const logCall = mockTransmissionLogCreate.mock.calls[0]?.[0];
		expect(logCall.data.provider).toBe("chorus-pro");
		expect(logCall.data.direction).toBe("OUTBOUND");
		expect(logCall.data.status).toBe("SUCCESS");
		expect(logCall.data.invoiceNumber).toBe("F-2027-00042");
		expect(logCall.data.providerInvoiceId).toBe("chorus:abc123");
		expect(logCall.data.attempt).toBe(1);
	});

	it("persists REJECTED with FAILED log + errorCode + errorMessage", async () => {
		mockOrderFindUnique
			.mockResolvedValueOnce({
				invoiceNumber: "F-2027-00042",
				pdpStatus: "SENT",
				pdpProviderRef: "chorus:abc123",
				pdpRetryCount: 0,
			})
			.mockResolvedValueOnce({
				pdpProviderRef: "chorus:abc123",
				pdpStatus: "SENT",
			});

		await persistPdpTransmission({
			orderId: "ord_42",
			providerName: "chorus-pro",
			result: {
				providerInvoiceId: "chorus:abc123",
				status: "REJECTED",
				submittedAt: new Date(),
			},
			errorCode: "INVALID_SIRET",
			errorMessage: "SIRET unknown in annuaire",
		});

		const updateCall = mockOrderUpdate.mock.calls[0]?.[0];
		expect(updateCall.data.pdpStatus).toBe("REJECTED");
		expect(updateCall.data.pdpRejectionCode).toBe("INVALID_SIRET");
		expect(updateCall.data.pdpRejectionReason).toBe("SIRET unknown in annuaire");
		expect(updateCall.data.pdpRejectedAt).toBeInstanceOf(Date);

		const logCall = mockTransmissionLogCreate.mock.calls[0]?.[0];
		expect(logCall.data.status).toBe("FAILED");
		expect(logCall.data.errorCode).toBe("INVALID_SIRET");
	});

	it("increments retry counters when transitioning REJECTED → SENT", async () => {
		mockOrderFindUnique
			.mockResolvedValueOnce({
				invoiceNumber: "F-2027-00042",
				pdpStatus: "REJECTED",
				pdpProviderRef: "chorus:abc123",
				pdpRetryCount: 2,
			})
			.mockResolvedValueOnce({
				pdpProviderRef: "chorus:abc123",
				pdpStatus: "REJECTED",
			});

		await persistPdpTransmission({
			orderId: "ord_42",
			providerName: "chorus-pro",
			result: {
				providerInvoiceId: "chorus:abc123",
				status: "SUBMITTED",
				submittedAt: new Date(),
			},
		});

		const updateCall = mockOrderUpdate.mock.calls[0]?.[0];
		expect(updateCall.data.pdpRetryCount).toBe(3);
		expect(updateCall.data.pdpLastRetryAt).toBeInstanceOf(Date);

		const logCall = mockTransmissionLogCreate.mock.calls[0]?.[0];
		expect(logCall.data.attempt).toBe(3);
	});

	it("ACCEPTED sets pdpAcceptedAt timestamp", async () => {
		mockOrderFindUnique
			.mockResolvedValueOnce({
				invoiceNumber: "F-2027-00042",
				pdpStatus: "SENT",
				pdpProviderRef: "chorus:abc123",
				pdpRetryCount: 0,
			})
			.mockResolvedValueOnce({
				pdpProviderRef: "chorus:abc123",
				pdpStatus: "SENT",
			});

		await persistPdpTransmission({
			orderId: "ord_42",
			providerName: "chorus-pro",
			result: {
				providerInvoiceId: "chorus:abc123",
				status: "ACCEPTED",
				submittedAt: new Date(),
			},
		});

		const updateCall = mockOrderUpdate.mock.calls[0]?.[0];
		expect(updateCall.data.pdpStatus).toBe("ACCEPTED");
		expect(updateCall.data.pdpAcceptedAt).toBeInstanceOf(Date);

		const historyCall = mockOrderHistoryCreate.mock.calls[0]?.[0];
		expect(historyCall.data.action).toBe("PDP_ACCEPTED");
	});

	it("CANCELLED maps to PDP_CANCELLED action", async () => {
		mockOrderFindUnique
			.mockResolvedValueOnce({
				invoiceNumber: "F-2027-00042",
				pdpStatus: "SENT",
				pdpProviderRef: "chorus:abc123",
				pdpRetryCount: 0,
			})
			.mockResolvedValueOnce({
				pdpProviderRef: "chorus:abc123",
				pdpStatus: "SENT",
			});

		await persistPdpTransmission({
			orderId: "ord_42",
			providerName: "chorus-pro",
			result: {
				providerInvoiceId: "chorus:abc123",
				status: "CANCELLED",
				submittedAt: new Date(),
			},
		});

		const historyCall = mockOrderHistoryCreate.mock.calls[0]?.[0];
		expect(historyCall.data.action).toBe("PDP_CANCELLED");
	});
});
