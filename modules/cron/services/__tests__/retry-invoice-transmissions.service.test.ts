import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOrderFindMany = vi.fn();
const mockOrderFindUnique = vi.fn();
const mockOrderUpdate = vi.fn();
const mockProvider = {
	id: "mock",
	capabilities: {
		submitInvoice: true,
		receiveInvoice: true,
		eReporting: true,
		directoryLookup: true,
	},
	submitInvoice: vi.fn(),
};
const mockPersistPdpTransmission = vi.fn();
const mockBuildInvoiceData = vi.fn();
const mockShouldTransmitInvoice = vi.fn();

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			findMany: (...args: unknown[]) => mockOrderFindMany(...args),
			findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
			update: (...args: unknown[]) => mockOrderUpdate(...args),
		},
	},
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/modules/invoices/providers/factory", () => ({
	getInvoiceProvider: () => mockProvider,
}));

vi.mock("@/modules/invoices/services/build-invoice-data", () => ({
	buildInvoiceData: (...args: unknown[]) => mockBuildInvoiceData(...args),
}));

vi.mock("@/modules/invoices/services/should-transmit-invoice", () => ({
	shouldTransmitInvoice: (...args: unknown[]) => mockShouldTransmitInvoice(...args),
}));

vi.mock("@/modules/orders/services/persist-pdp-transmission.service", () => ({
	persistPdpTransmission: (...args: unknown[]) => mockPersistPdpTransmission(...args),
}));

// withDeadline est importé pour borner l'appel provider (CRON-AUDIT-001). On
// passe-plat ici pour éviter de charger le vrai module (qui touche EReportingStatus
// au top-level, absent du mock prisma-client partiel de ce fichier).
vi.mock("@/modules/invoices/services/submit-ereporting-batch.service", () => ({
	withDeadline: <T>(p: Promise<T>) => p,
}));

vi.mock("@/modules/orders/constants/order.constants", () => ({
	GET_ORDER_SELECT_ADMIN: { id: true, invoiceNumber: true },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PdpTransmissionStatus: {
		PENDING: "PENDING",
		SENT: "SENT",
		ACCEPTED: "ACCEPTED",
		REJECTED: "REJECTED",
		RETRYING: "RETRYING",
		CANCELLED: "CANCELLED",
		ABANDONED: "ABANDONED",
	},
}));

import { retryInvoiceTransmissions } from "../retry-invoice-transmissions.service";

describe("retryInvoiceTransmissions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockShouldTransmitInvoice.mockReturnValue(true);
		mockBuildInvoiceData.mockReturnValue({ invoiceNumber: "F-2027-00042" });
		mockProvider.capabilities.submitInvoice = true;
		mockProvider.submitInvoice = vi.fn();
	});

	it("returns reason='provider-no-submit-capability' when capability is disabled", async () => {
		mockProvider.capabilities.submitInvoice = false;
		const result = await retryInvoiceTransmissions();
		expect(result.reason).toBe("provider-no-submit-capability");
		expect(mockOrderFindMany).not.toHaveBeenCalled();
	});

	it("returns 0/0/0 when no candidates", async () => {
		mockOrderFindMany.mockResolvedValueOnce([]);
		const result = await retryInvoiceTransmissions();
		expect(result.processed).toBe(0);
		expect(result.errored).toBe(0);
	});

	it("respects exponential backoff (skips orders within backoff window)", async () => {
		const recentRetry = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago, backoff = 15 min
		mockOrderFindMany.mockResolvedValueOnce([
			{
				id: "ord_1",
				pdpRetryCount: 0,
				pdpLastRetryAt: recentRetry,
				pdpRejectionCode: "TIMEOUT",
				total: 5000,
			},
		]);

		const result = await retryInvoiceTransmissions();
		expect(result.skipped).toBe(1);
		expect(result.processed).toBe(0);
		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
	});

	it("abandons orders with non-retryable error code", async () => {
		mockOrderFindMany.mockResolvedValueOnce([
			{
				id: "ord_1",
				pdpRetryCount: 0,
				pdpLastRetryAt: new Date(Date.now() - 60 * 60 * 1000),
				pdpRejectionCode: "INVALID_SIRET",
				total: 5000,
			},
		]);
		mockOrderUpdate.mockResolvedValueOnce({});

		const result = await retryInvoiceTransmissions();
		expect(result.abandoned).toBe(1);
		const updateCall = mockOrderUpdate.mock.calls[0]?.[0];
		expect(updateCall.data.pdpStatus).toBe("ABANDONED");
		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
	});

	it("retries successfully and calls persistPdpTransmission", async () => {
		mockOrderFindMany.mockResolvedValueOnce([
			{
				id: "ord_1",
				pdpRetryCount: 1,
				pdpLastRetryAt: new Date(Date.now() - 60 * 60 * 1000),
				pdpRejectionCode: "TIMEOUT",
				total: 5000,
			},
		]);
		mockOrderFindUnique.mockResolvedValueOnce({
			id: "ord_1",
			invoiceNumber: "F-2027-00042",
		});
		mockProvider.submitInvoice.mockResolvedValueOnce({
			providerInvoiceId: "mock:F-2027-00042",
			status: "SUBMITTED",
			submittedAt: new Date(),
		});
		mockPersistPdpTransmission.mockResolvedValueOnce({ status: "PERSISTED" });

		const result = await retryInvoiceTransmissions();
		expect(result.processed).toBe(1);
		expect(mockProvider.submitInvoice).toHaveBeenCalledOnce();
		expect(mockPersistPdpTransmission).toHaveBeenCalledOnce();
	});

	it("skips when shouldTransmitInvoice returns false (canary kill-switch)", async () => {
		mockOrderFindMany.mockResolvedValueOnce([
			{
				id: "ord_1",
				pdpRetryCount: 0,
				pdpLastRetryAt: new Date(Date.now() - 60 * 60 * 1000),
				pdpRejectionCode: "TIMEOUT",
				total: 5000,
			},
		]);
		mockShouldTransmitInvoice.mockReturnValueOnce(false);

		const result = await retryInvoiceTransmissions();
		expect(result.skipped).toBe(1);
		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
	});

	it("abandons on submit error when retry count reaches MAX", async () => {
		mockOrderFindMany.mockResolvedValueOnce([
			{
				id: "ord_1",
				pdpRetryCount: 4, // current retry will be 5th and last
				// Backoff pour retryCount=4 = min(4h, 15min*2^4=240min=4h). Mettre 5h.
				pdpLastRetryAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
				pdpRejectionCode: "TIMEOUT",
				total: 5000,
			},
		]);
		mockOrderFindUnique.mockResolvedValueOnce({
			id: "ord_1",
			invoiceNumber: "F-2027-00042",
		});
		mockProvider.submitInvoice.mockRejectedValueOnce(new Error("network down"));
		mockOrderUpdate.mockResolvedValueOnce({});

		const result = await retryInvoiceTransmissions();
		expect(result.errored).toBe(1);
		expect(result.abandoned).toBe(1);
		const updateCall = mockOrderUpdate.mock.calls[0]?.[0];
		expect(updateCall.data.pdpStatus).toBe("ABANDONED");
	});

	it("s'arrête sur deadline sans transmettre et signale hasMore (CRON-AUDIT-001)", async () => {
		mockOrderFindMany.mockResolvedValueOnce([
			{
				id: "ord_1",
				pdpRetryCount: 0,
				pdpLastRetryAt: null,
				pdpRejectionCode: "TIMEOUT",
				total: 5000,
			},
		]);
		// deadline(1000 → +45s = 46000), loop-check(1_000_000 ≥ 46000 → break)
		const nowSpy = vi.spyOn(Date, "now").mockReturnValueOnce(1_000).mockReturnValue(1_000_000);

		const result = await retryInvoiceTransmissions();

		expect(mockProvider.submitInvoice).not.toHaveBeenCalled();
		expect(result.processed).toBe(0);
		expect(result.hasMore).toBe(true);
		nowSpy.mockRestore();
	});
});
