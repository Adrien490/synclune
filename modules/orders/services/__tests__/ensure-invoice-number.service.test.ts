import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockPrisma,
	mockPersistInvoiceNumber,
	mockLogger,
	mockArchiveInvoicePdf,
	mockRenderInvoicePdf,
	mockBuildInvoiceData,
	mockSendAdminAlert,
	mockCreateOrderAudit,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findUnique: vi.fn(),
			update: vi.fn().mockResolvedValue({}),
		},
	},
	mockPersistInvoiceNumber: vi.fn(),
	mockArchiveInvoicePdf: vi.fn(),
	mockRenderInvoicePdf: vi.fn().mockReturnValue(new ArrayBuffer(4)),
	mockBuildInvoiceData: vi.fn().mockReturnValue({}),
	mockSendAdminAlert: vi.fn(),
	mockCreateOrderAudit: vi.fn(),
	mockLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("../persist-invoice-number.service", () => ({
	persistInvoiceNumber: mockPersistInvoiceNumber,
}));

vi.mock("../archive-invoice-pdf.service", () => ({
	archiveInvoicePdf: mockArchiveInvoicePdf,
}));

vi.mock("@/modules/invoices/services/render-invoice-pdf", () => ({
	renderInvoicePdf: mockRenderInvoicePdf,
}));

vi.mock("@/modules/invoices/services/build-invoice-data", () => ({
	buildInvoiceData: mockBuildInvoiceData,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminInvoiceFailedAlert: mockSendAdminAlert,
}));

vi.mock("../utils/order-audit", () => ({
	createOrderAudit: mockCreateOrderAudit,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

import { ensureInvoiceNumberPersisted } from "../ensure-invoice-number.service";

/**
 * @regression ORD-COMPLY-002 (audit conformité 2026-05-27)
 *
 * Verrouille que la facture est générée à l'encaissement Stripe et non lazy.
 */
describe("ensureInvoiceNumberPersisted", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("persists invoice number when order is PAID and invoiceNumber is null", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceNumber: null,
			paymentStatus: "PAID",
		});
		mockPersistInvoiceNumber.mockResolvedValue({
			invoiceNumber: "F-2026-00042",
			invoiceGeneratedAt: new Date(),
		});

		await ensureInvoiceNumberPersisted("order-1");

		expect(mockPersistInvoiceNumber).toHaveBeenCalledWith("order-1");
	});

	it("is idempotent — noop when invoiceNumber already set", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceNumber: "F-2026-00001",
			paymentStatus: "PAID",
		});

		await ensureInvoiceNumberPersisted("order-1");

		expect(mockPersistInvoiceNumber).not.toHaveBeenCalled();
	});

	it("skips when order is not PAID (defensive)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceNumber: null,
			paymentStatus: "PENDING",
		});

		await ensureInvoiceNumberPersisted("order-1");

		expect(mockPersistInvoiceNumber).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	/**
	 * @regression ensure-invoice-non-paid-2026-05-28
	 *
	 * Verrouille que TOUS les statuts non-PAID sont rejetés. Si l'enum
	 * `PaymentStatus` évolue (ajout d'un statut intermédiaire post-checkout),
	 * ce test doit être mis à jour explicitement — sinon une commande non
	 * encaissée pourrait émettre une facture (violation Art. 289-I CGI :
	 * émission à l'encaissement).
	 */
	it.each(["PENDING", "FAILED", "EXPIRED", "PARTIALLY_REFUNDED", "REFUNDED"] as const)(
		"refuses to persist invoice number when paymentStatus is %s",
		async (status) => {
			mockPrisma.order.findUnique.mockResolvedValue({
				invoiceNumber: null,
				paymentStatus: status,
			});

			await ensureInvoiceNumberPersisted("order-1");

			expect(mockPersistInvoiceNumber).not.toHaveBeenCalled();
		},
	);

	it("supports guest orders (userId null)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceNumber: null,
			paymentStatus: "PAID",
		});
		mockPersistInvoiceNumber.mockResolvedValue({
			invoiceNumber: "F-2026-00043",
			invoiceGeneratedAt: new Date(),
		});

		await ensureInvoiceNumberPersisted("order-guest-1");

		expect(mockPersistInvoiceNumber).toHaveBeenCalledWith("order-guest-1");
	});

	it("does not throw when persist fails — webhook must succeed regardless", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceNumber: null,
			paymentStatus: "PAID",
		});
		mockPersistInvoiceNumber.mockResolvedValue(null);

		await expect(ensureInvoiceNumberPersisted("order-1")).resolves.toBeUndefined();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("does not throw when DB read throws — webhook must succeed regardless", async () => {
		mockPrisma.order.findUnique.mockRejectedValue(new Error("connection lost"));

		await expect(ensureInvoiceNumberPersisted("order-1")).resolves.toBeUndefined();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("warns when order is missing instead of throwing", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		await ensureInvoiceNumberPersisted("missing");

		expect(mockPersistInvoiceNumber).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalled();
	});
});
