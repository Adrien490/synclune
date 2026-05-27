import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockPrisma,
	mockUpdateTag,
	mockCreateOrderAuditTx,
	mockLogger,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		$transaction: vi.fn(),
		order: { findUnique: vi.fn(), update: vi.fn() },
	},
	mockUpdateTag: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	mockGetOrderInvalidationTags: vi.fn(() => ["tag-1", "tag-2"]),
}));

vi.mock("@/app/generated/prisma/client", () => {
	class FakePrismaClientKnownRequestError extends Error {
		code: string;
		constructor(message: string, opts: { code: string }) {
			super(message);
			this.code = opts.code;
			Object.setPrototypeOf(this, FakePrismaClientKnownRequestError.prototype);
		}
	}
	return {
		Prisma: {
			PrismaClientKnownRequestError: FakePrismaClientKnownRequestError,
			sql: (strings: TemplateStringsArray, ...values: unknown[]) =>
				strings.reduce((acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ""), ""),
		},
		HistorySource: { ADMIN: "ADMIN", WEBHOOK: "WEBHOOK", SYSTEM: "SYSTEM", CUSTOMER: "CUSTOMER" },
		OrderAction: { INVOICE_VOIDED: "INVOICE_VOIDED" },
		InvoiceStatus: { PENDING: "PENDING", GENERATED: "GENERATED", VOIDED: "VOIDED" },
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

import { voidInvoice } from "../void-invoice.service";

const AUTHOR = {
	authorId: "admin-1",
	authorName: "Alice Admin",
	source: "ADMIN" as const,
	reason: "Annulation après facture",
};

interface FakeTx {
	$executeRaw: ReturnType<typeof vi.fn>;
	$queryRaw: ReturnType<typeof vi.fn>;
	order: {
		findUnique: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
	};
}

function makeTx(overrides?: Partial<FakeTx>): FakeTx {
	return {
		$executeRaw: vi.fn(),
		$queryRaw: vi.fn().mockResolvedValue([]),
		order: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		...overrides,
	} as FakeTx;
}

/**
 * @regression ORD-COMPLY-003 (audit conformité 2026-05-27)
 * Verrouille le cycle VOIDED + génération avoir A-YYYY-NNNNN séquentiel.
 */
describe("voidInvoice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("generates first credit note of the year (A-YYYY-00001) + sets invoiceStatus=VOIDED", async () => {
		const tx = makeTx();
		tx.order.findUnique.mockResolvedValue({
			id: "order-1",
			userId: "user-1",
			invoiceNumber: "F-2026-00010",
			invoiceStatus: "GENERATED",
			invoiceVoidedAt: null,
			creditNoteNumber: null,
		});
		tx.$queryRaw.mockResolvedValue([]); // pas d'avoir précédent
		tx.order.update.mockResolvedValue({
			invoiceVoidedAt: new Date("2026-05-27T18:00:00Z"),
			creditNoteNumber: "A-2026-00001",
			creditNoteGeneratedAt: new Date("2026-05-27T18:00:00Z"),
			userId: "user-1",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await voidInvoice({ orderId: "order-1", ...AUTHOR });

		expect(result?.creditNoteNumber).toBe("A-2026-00001");
		expect(tx.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					invoiceStatus: "VOIDED",
					creditNoteNumber: expect.stringMatching(/^A-\d{4}-\d{5}$/),
				}),
			}),
		);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				orderId: "order-1",
				action: "INVOICE_VOIDED",
				metadata: expect.objectContaining({
					invoiceNumber: "F-2026-00010",
					creditNoteNumber: "A-2026-00001",
				}),
			}),
		);
		expect(mockUpdateTag).toHaveBeenCalledTimes(2);
	});

	it("increments sequence from last existing credit note", async () => {
		const tx = makeTx();
		tx.order.findUnique.mockResolvedValue({
			id: "order-2",
			userId: "user-1",
			invoiceNumber: "F-2026-00050",
			invoiceStatus: "GENERATED",
			invoiceVoidedAt: null,
			creditNoteNumber: null,
		});
		const year = new Date().getFullYear();
		tx.$queryRaw.mockResolvedValue([{ creditNoteNumber: `A-${year}-00041` }]);
		tx.order.update.mockResolvedValue({
			invoiceVoidedAt: new Date(),
			creditNoteNumber: `A-${year}-00042`,
			creditNoteGeneratedAt: new Date(),
			userId: "user-1",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await voidInvoice({ orderId: "order-2", ...AUTHOR });

		expect(result?.creditNoteNumber).toBe(`A-${year}-00042`);
	});

	it("idempotent — noop when invoice already VOIDED (no double credit note)", async () => {
		const tx = makeTx();
		tx.order.findUnique.mockResolvedValue({
			id: "order-3",
			userId: "user-1",
			invoiceNumber: "F-2026-00010",
			invoiceStatus: "VOIDED",
			invoiceVoidedAt: new Date(),
			creditNoteNumber: "A-2026-00007",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await voidInvoice({ orderId: "order-3", ...AUTHOR });

		expect(result).toBeNull();
		expect(tx.order.update).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});

	it("idempotent — race guard when creditNoteNumber set but invoiceStatus still GENERATED", async () => {
		const tx = makeTx();
		tx.order.findUnique.mockResolvedValue({
			id: "order-3b",
			userId: "user-1",
			invoiceNumber: "F-2026-00011",
			invoiceStatus: "GENERATED",
			invoiceVoidedAt: null,
			creditNoteNumber: "A-2026-00008",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await voidInvoice({ orderId: "order-3b", ...AUTHOR });

		expect(result).toBeNull();
		expect(tx.order.update).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});

	it("returns null when invoiceNumber is absent (no active invoice to void)", async () => {
		const tx = makeTx();
		tx.order.findUnique.mockResolvedValue({
			id: "order-4",
			userId: null,
			invoiceNumber: null,
			invoiceStatus: null,
			invoiceVoidedAt: null,
			creditNoteNumber: null,
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await voidInvoice({ orderId: "order-4", ...AUTHOR });

		expect(result).toBeNull();
		expect(tx.order.update).not.toHaveBeenCalled();
	});

	it("returns null when order is missing", async () => {
		const tx = makeTx();
		tx.order.findUnique.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await voidInvoice({ orderId: "missing", ...AUTHOR });

		expect(result).toBeNull();
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it("retries on P2002 unique constraint violation up to MAX_RETRIES", async () => {
		const { Prisma } = await import("@/app/generated/prisma/client");
		mockPrisma.$transaction
			.mockRejectedValueOnce(
				new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" }),
			)
			.mockResolvedValueOnce({
				kind: "voided",
				updated: {
					invoiceVoidedAt: new Date(),
					creditNoteNumber: "A-2026-00099",
					creditNoteGeneratedAt: new Date(),
					userId: "user-1",
				},
			});

		const result = await voidInvoice({ orderId: "order-5", ...AUTHOR });

		expect(result?.creditNoteNumber).toBe("A-2026-00099");
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
	});

	it("does not retry on non-P2002 errors", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB connection lost"));

		const result = await voidInvoice({ orderId: "order-6", ...AUTHOR });

		expect(result).toBeNull();
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		expect(mockLogger.error).toHaveBeenCalled();
	});
});
