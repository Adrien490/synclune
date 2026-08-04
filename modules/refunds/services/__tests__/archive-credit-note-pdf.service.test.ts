import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Archivage PDF avoir partiel (Refund.creditNotePdf*) — symétrique à
 * `orders/archive-invoice-pdf.service.ts` (IDEM-PDF-001 : claim conditionnel).
 *
 * ⚠️ Ce fichier verrouillait aussi l'action d'audit (CREDIT_NOTE_ARCHIVED vs
 * INVOICE_ARCHIVED). Les deux valeurs ont été retirées d'`OrderAction` le
 * 2026-08-05 : l'archivage est DÉRIVABLE de `creditNotePdfUrl`. Ce qui reste
 * verrouillé ici — et qui compte — est le claim conditionnel et le hash réel.
 */

const { mockPrisma, mockUtapi, mockLogger, mockCreateOrderAuditTx, mockCreateOrderAudit } =
	vi.hoisted(() => ({
		mockPrisma: {
			refund: {
				findUnique: vi.fn(),
				updateMany: vi.fn(),
			},
			order: { findUnique: vi.fn() },
			$transaction: vi.fn(),
		},
		mockUtapi: {
			uploadFiles: vi.fn(),
			deleteFiles: vi.fn(),
		},
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		mockCreateOrderAuditTx: vi.fn(),
		mockCreateOrderAudit: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/uploadthing", () => ({ utapi: mockUtapi }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAudit: mockCreateOrderAudit,
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCreditNotePdfArchiveFailedAlert: vi.fn(),
}));

import { OrderAction } from "@/app/generated/prisma/client";
import { archiveCreditNotePdf } from "../archive-credit-note-pdf.service";

const sampleBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
const sampleHash = createHash("sha256").update(sampleBytes).digest("hex");

const REFUND_ID = "refund-1";
const CREDIT_NOTE_NUMBER = "A-2026-00042";

function makeRefundRow(overrides: Record<string, unknown> = {}) {
	return {
		id: REFUND_ID,
		orderId: "order-1",
		creditNotePdfUrl: null,
		creditNotePdfHash: null,
		...overrides,
	};
}

describe("archiveCreditNotePdf (Refund) — claim conditionnel", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) =>
			cb(mockPrisma),
		);
		mockUtapi.deleteFiles.mockResolvedValue({ success: true });
	});

	it("claim GAGNÉ : hash SHA-256 réel persisté", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(makeRefundRow());
		mockUtapi.uploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://ufs.example/cn.pdf", key: "key-1" } },
		]);
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		const result = await archiveCreditNotePdf(REFUND_ID, CREDIT_NOTE_NUMBER, sampleBytes);

		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith({
			where: { id: REFUND_ID, OR: [{ creditNotePdfUrl: null }, { creditNotePdfHash: null }] },
			data: {
				creditNotePdfUrl: "https://ufs.example/cn.pdf",
				creditNotePdfHash: sampleHash,
			},
		});
		expect(result).toEqual({
			creditNotePdfUrl: "https://ufs.example/cn.pdf",
			creditNotePdfHash: sampleHash,
		});
	});

	it("idempotent : archive déjà présente → retour immédiat sans upload ni audit (jamais d'overwrite)", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(
			makeRefundRow({
				creditNotePdfUrl: "https://ufs.example/existing.pdf",
				creditNotePdfHash: "a".repeat(64),
			}),
		);

		const result = await archiveCreditNotePdf(REFUND_ID, CREDIT_NOTE_NUMBER, sampleBytes);

		expect(mockUtapi.uploadFiles).not.toHaveBeenCalled();
		expect(mockPrisma.refund.updateMany).not.toHaveBeenCalled();
		expect(result).toEqual({
			creditNotePdfUrl: "https://ufs.example/existing.pdf",
			creditNotePdfHash: "a".repeat(64),
		});
	});

	it("claim PERDU (archiveur concurrent) : orphelin supprimé, AUCUN audit, archive gagnante servie", async () => {
		mockPrisma.refund.findUnique
			// Pré-check hors tx : pas encore archivé.
			.mockResolvedValueOnce(makeRefundRow())
			// Re-fetch post-claim-perdu : l'archive du gagnant.
			.mockResolvedValueOnce(
				makeRefundRow({
					creditNotePdfUrl: "https://ufs.example/winner.pdf",
					creditNotePdfHash: "c".repeat(64),
				}),
			);
		mockUtapi.uploadFiles.mockResolvedValue([
			{ data: { ufsUrl: "https://ufs.example/loser.pdf", key: "loser-key" } },
		]);
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 0 });

		const result = await archiveCreditNotePdf(REFUND_ID, CREDIT_NOTE_NUMBER, sampleBytes);

		expect(mockUtapi.deleteFiles).toHaveBeenCalledWith(["loser-key"]);
		expect(result).toEqual({
			creditNotePdfUrl: "https://ufs.example/winner.pdf",
			creditNotePdfHash: "c".repeat(64),
		});
	});
});
