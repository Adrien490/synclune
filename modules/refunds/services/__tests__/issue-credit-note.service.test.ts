import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @regression EINV-CREDIT-001 + EINV-CREDIT-005 + EINV-CREDIT-010
 * (audit avoirs 2026-05-28)
 *
 * Verrouille la génération séquentielle gap-free de `A-YYYY-NNNNN` sur
 * `Refund.creditNoteNumber`, partagée avec `Order.creditNoteNumber` via
 * lookup UNION + advisory lock 2_000_000+year.
 */

const {
	mockPrisma,
	mockUpdateTag,
	mockCreateOrderAuditTx,
	mockLogger,
	mockGetOrderInvalidationTags,
	mockSendAdminSequenceOverflowAlert,
} = vi.hoisted(() => ({
	mockPrisma: {
		$transaction: vi.fn(),
		refund: { findUnique: vi.fn(), update: vi.fn() },
	},
	mockUpdateTag: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	mockGetOrderInvalidationTags: vi.fn(() => ["tag-order-1"]),
	mockSendAdminSequenceOverflowAlert: vi.fn(),
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
		OrderAction: { CREDIT_NOTE_GENERATED: "CREDIT_NOTE_GENERATED" },
		RefundStatus: {
			PENDING: "PENDING",
			APPROVED: "APPROVED",
			COMPLETED: "COMPLETED",
			FAILED: "FAILED",
			REJECTED: "REJECTED",
			CANCELLED: "CANCELLED",
		},
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../constants/cache", () => ({
	REFUNDS_CACHE_TAGS: { DETAIL: (id: string) => `refunds-detail-${id}` },
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminSequenceOverflowAlert: mockSendAdminSequenceOverflowAlert,
}));

import { issueCreditNoteForRefund } from "../issue-credit-note.service";

interface FakeTx {
	$executeRaw: ReturnType<typeof vi.fn>;
	$queryRaw: ReturnType<typeof vi.fn>;
	refund: {
		findUnique: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
	};
}

function makeTx(): FakeTx {
	return {
		$executeRaw: vi.fn(),
		$queryRaw: vi.fn().mockResolvedValue([]),
		refund: { findUnique: vi.fn(), update: vi.fn() },
	};
}

const AUTHOR = {
	source: "ADMIN" as const,
	authorId: "admin-1",
	authorName: "Alice Admin",
};

describe("issueCreditNoteForRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("émet le premier avoir de l'année (A-YYYY-00001) sur Refund.creditNoteNumber", async () => {
		const year = new Date().getFullYear();
		const tx = makeTx();
		tx.refund.findUnique.mockResolvedValue({
			id: "refund-1",
			orderId: "order-1",
			amount: 5000,
			status: "COMPLETED",
			creditNoteNumber: null,
			order: {
				id: "order-1",
				userId: "user-1",
				invoiceNumber: `F-${year}-00010`,
				invoiceStatus: "GENERATED",
			},
		});
		tx.$queryRaw.mockResolvedValue([{ cn: null }]);
		tx.refund.update.mockResolvedValue({
			creditNoteNumber: `A-${year}-00001`,
			creditNoteGeneratedAt: new Date(),
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await issueCreditNoteForRefund({ refundId: "refund-1", ...AUTHOR });

		expect(result.kind).toBe("issued");
		if (result.kind !== "issued") throw new Error("expected issued");
		expect(result.creditNoteNumber).toBe(`A-${year}-00001`);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				orderId: "order-1",
				action: "CREDIT_NOTE_GENERATED",
				metadata: expect.objectContaining({
					refundId: "refund-1",
					creditNoteNumber: `A-${year}-00001`,
					invoiceNumber: `F-${year}-00010`,
				}),
			}),
		);
	});

	it("incrémente depuis le dernier avoir UNION (Order + Refund) — gap-free partagé", async () => {
		const year = new Date().getFullYear();
		const tx = makeTx();
		tx.refund.findUnique.mockResolvedValue({
			id: "refund-2",
			orderId: "order-2",
			amount: 3000,
			status: "COMPLETED",
			creditNoteNumber: null,
			order: {
				id: "order-2",
				userId: null,
				invoiceNumber: `F-${year}-00050`,
				invoiceStatus: "GENERATED",
			},
		});
		// Lookup UNION retourne le max global (Order ou Refund — peu importe la source)
		tx.$queryRaw.mockResolvedValue([{ cn: `A-${year}-00041` }]);
		tx.refund.update.mockResolvedValue({
			creditNoteNumber: `A-${year}-00042`,
			creditNoteGeneratedAt: new Date(),
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await issueCreditNoteForRefund({ refundId: "refund-2", ...AUTHOR });

		expect(result.kind).toBe("issued");
		if (result.kind !== "issued") throw new Error("expected issued");
		expect(result.creditNoteNumber).toBe(`A-${year}-00042`);
	});

	it("idempotent — noop quand Refund.creditNoteNumber déjà set", async () => {
		const tx = makeTx();
		tx.refund.findUnique.mockResolvedValue({
			id: "refund-3",
			orderId: "order-3",
			amount: 2000,
			status: "COMPLETED",
			creditNoteNumber: "A-2026-00007",
			order: {
				id: "order-3",
				userId: "user-3",
				invoiceNumber: "F-2026-00010",
				invoiceStatus: "GENERATED",
			},
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await issueCreditNoteForRefund({ refundId: "refund-3", ...AUTHOR });

		expect(result.kind).toBe("noop");
		if (result.kind === "noop") {
			expect(result.reason).toBe("already-issued");
			expect(result.creditNoteNumber).toBe("A-2026-00007");
		}
		expect(tx.refund.update).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});

	it("noop quand le refund n'est pas COMPLETED (refund APPROVED → skip émission avoir)", async () => {
		const tx = makeTx();
		tx.refund.findUnique.mockResolvedValue({
			id: "refund-4",
			orderId: "order-4",
			amount: 4000,
			status: "APPROVED",
			creditNoteNumber: null,
			order: {
				id: "order-4",
				userId: null,
				invoiceNumber: "F-2026-00100",
				invoiceStatus: "GENERATED",
			},
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await issueCreditNoteForRefund({ refundId: "refund-4", ...AUTHOR });

		expect(result.kind).toBe("noop");
		if (result.kind === "noop") {
			expect(result.reason).toBe("refund-not-completed");
		}
	});

	it("noop quand pas de facture originale sur l'order (skip émission avoir)", async () => {
		const tx = makeTx();
		tx.refund.findUnique.mockResolvedValue({
			id: "refund-5",
			orderId: "order-5",
			amount: 1000,
			status: "COMPLETED",
			creditNoteNumber: null,
			order: {
				id: "order-5",
				userId: null,
				invoiceNumber: null,
				invoiceStatus: null,
			},
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await issueCreditNoteForRefund({ refundId: "refund-5", ...AUTHOR });

		expect(result.kind).toBe("noop");
		if (result.kind === "noop") {
			expect(result.reason).toBe("missing");
		}
	});

	it("retry sur P2002 unique violation (race séquence partagée Order/Refund)", async () => {
		const { Prisma } = await import("@/app/generated/prisma/client");
		mockPrisma.$transaction
			.mockRejectedValueOnce(
				new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" }),
			)
			.mockResolvedValueOnce({
				kind: "issued-tx",
				updated: {
					creditNoteNumber: "A-2026-00099",
					creditNoteGeneratedAt: new Date(),
				},
				orderUserId: "user-x",
				orderId: "order-x",
			});

		const result = await issueCreditNoteForRefund({ refundId: "refund-6", ...AUTHOR });

		expect(result.kind).toBe("issued");
		if (result.kind !== "issued") throw new Error("expected issued");
		expect(result.creditNoteNumber).toBe("A-2026-00099");
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
	});

	it("returns failed kind sur erreur non-P2002 (ex: DB connection lost)", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB connection lost"));

		const result = await issueCreditNoteForRefund({ refundId: "refund-7", ...AUTHOR });

		expect(result.kind).toBe("failed");
		if (result.kind === "failed") {
			expect(result.error).toBe("DB connection lost");
		}
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
	});

	it("noop missing — refund inexistant (findUnique retourne null)", async () => {
		const tx = makeTx();
		tx.refund.findUnique.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await issueCreditNoteForRefund({ refundId: "ghost", ...AUTHOR });

		expect(result.kind).toBe("noop");
		if (result.kind === "noop") expect(result.reason).toBe("missing");
		expect(tx.refund.update).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});

	it("overflow A-YYYY-99999 → BusinessError CREDIT_NOTE_SEQUENCE_OVERFLOW + admin alert + failed", async () => {
		const year = new Date().getFullYear();
		const tx = makeTx();
		tx.refund.findUnique.mockResolvedValue({
			id: "refund-overflow",
			orderId: "order-overflow",
			amount: 5000,
			status: "COMPLETED",
			creditNoteNumber: null,
			order: {
				id: "order-overflow",
				userId: null,
				invoiceNumber: `F-${year}-00010`,
				invoiceStatus: "GENERATED",
			},
		});
		tx.$queryRaw.mockResolvedValue([{ cn: `A-${year}-99999` }]); // sequence epuisée
		// Service appelle `sendAdminSequenceOverflowAlert(...).catch(...)` — il faut
		// que le mock retourne une Promise pour que `.catch` soit chainable.
		mockSendAdminSequenceOverflowAlert.mockResolvedValue(undefined);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		const result = await issueCreditNoteForRefund({ refundId: "refund-overflow", ...AUTHOR });

		expect(result.kind).toBe("failed");
		expect(mockSendAdminSequenceOverflowAlert).toHaveBeenCalledWith({
			year,
			documentType: "credit-note",
		});
		expect(tx.refund.update).not.toHaveBeenCalled();
	});

	it("immutabilité Order — service n'utilise jamais tx.order.* (garde CLAUDE.md invariant #1)", async () => {
		const year = new Date().getFullYear();
		const tx = makeTx();
		tx.refund.findUnique.mockResolvedValue({
			id: "refund-immut",
			orderId: "order-immut",
			amount: 5000,
			status: "COMPLETED",
			creditNoteNumber: null,
			order: {
				id: "order-immut",
				userId: "user-immut",
				invoiceNumber: `F-${year}-00500`,
				invoiceStatus: "GENERATED",
			},
		});
		tx.$queryRaw.mockResolvedValue([{ cn: null }]);
		tx.refund.update.mockResolvedValue({
			creditNoteNumber: `A-${year}-00001`,
			creditNoteGeneratedAt: new Date(),
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>) =>
			fn(tx),
		);

		await issueCreditNoteForRefund({ refundId: "refund-immut", ...AUTHOR });

		// `tx` n'a volontairement PAS de propriété `order` (cf makeTx ligne 86-92).
		// Si un dev futur ajoute `tx.order.update(...)`, ce service deviendrait une
		// 2ᵉ source d'écriture sur Order.invoice* — violation invariant #1 CLAUDE.md.
		expect((tx as unknown as Record<string, unknown>).order).toBeUndefined();
		// Sanity : seules les colonnes Refund.creditNote* sont écrites.
		expect(tx.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					creditNoteNumber: expect.stringMatching(/^A-\d{4}-\d{5}$/),
					creditNoteGeneratedAt: expect.any(Date),
				}),
			}),
		);
		// Et que ce sont les SEULES clés (pas de invoiceNumber, invoiceStatus, etc.)
		const updateCall = tx.refund.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
		expect(Object.keys(updateCall.data).sort()).toEqual(
			["creditNoteGeneratedAt", "creditNoteNumber"].sort(),
		);
	});
});
