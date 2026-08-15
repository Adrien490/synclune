/**
 * @regression retractation-refund-finalization
 *
 * Invariants du remboursement de rétractation :
 * - le numéro d'avoir (`creditNoteNumber`) vient d'un compteur séquentiel
 *   DISTINCT du compteur facture, attribué dans la MÊME transaction que la
 *   transition REFUNDED (max+1, retry borné ×3 sur P2002) ;
 * - la garde de transition (statut source AWAITING_RETURN) rend tout rejeu
 *   `noop` : pas de numéro consommé, pas de restock ;
 * - le restock est OPT-IN et ignore les `variantId` null (SetNull).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { finalizeRetractationRefund } from "../finalize-retractation-refund.service";

const { FakePrismaKnownRequestError } = vi.hoisted(() => {
	class FakePrismaKnownRequestError extends Error {
		code: string;
		constructor(code: string) {
			super(`fake prisma error ${code}`);
			this.code = code;
		}
	}
	return { FakePrismaKnownRequestError };
});

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { PrismaClientKnownRequestError: FakePrismaKnownRequestError },
}));

const mocks = vi.hoisted(() => {
	const tx = {
		retractationRequest: {
			updateMany: vi.fn(),
			aggregate: vi.fn(),
			update: vi.fn(),
			findUnique: vi.fn(),
		},
		order: { updateMany: vi.fn() },
		productVariant: { updateMany: vi.fn() },
	};
	return {
		tx,
		$transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { $transaction: mocks.$transaction },
}));

const RETRACTATION = {
	orderId: "order-1",
	order: {
		items: [
			{ variantId: "variant-a", quantity: 2 },
			{ variantId: null, quantity: 1 },
		],
	},
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.tx.retractationRequest.updateMany.mockResolvedValue({ count: 1 });
	mocks.tx.retractationRequest.aggregate.mockResolvedValue({ _max: { creditNoteNumber: null } });
	mocks.tx.retractationRequest.update.mockResolvedValue({});
	mocks.tx.retractationRequest.findUnique.mockResolvedValue(RETRACTATION);
	mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
});

describe("finalizeRetractationRefund", () => {
	it("premier avoir : max null → 1, dans la même transaction que la transition", async () => {
		const result = await finalizeRetractationRefund({
			retractationId: "ret-1",
			stripeRefundId: "re_123",
			restock: false,
		});

		expect(result.outcome).toBe("refunded");
		expect(result.creditNoteNumber).toBe(1);
		expect(mocks.tx.retractationRequest.updateMany).toHaveBeenCalledWith({
			where: { id: "ret-1", status: "AWAITING_RETURN" },
			data: expect.objectContaining({ status: "REFUNDED", stripeRefundId: "re_123" }),
		});
		expect(mocks.tx.order.updateMany).toHaveBeenCalledWith({
			where: { id: "order-1", status: { in: ["PAID", "SHIPPED"] } },
			data: { status: "REFUNDED" },
		});
		// restock: false → AUCUN increment
		expect(mocks.tx.productVariant.updateMany).not.toHaveBeenCalled();
	});

	it("suit SA séquence : max 6 → 7 (compteur distinct des factures)", async () => {
		mocks.tx.retractationRequest.aggregate.mockResolvedValue({ _max: { creditNoteNumber: 6 } });

		const result = await finalizeRetractationRefund({
			retractationId: "ret-1",
			stripeRefundId: "re_123",
			restock: false,
		});

		expect(result.creditNoteNumber).toBe(7);
	});

	it("rejeu (count = 0, ex. REFUNDED impossible depuis un statut déjà traité) : noop total", async () => {
		mocks.tx.retractationRequest.updateMany.mockResolvedValue({ count: 0 });

		const result = await finalizeRetractationRefund({
			retractationId: "ret-1",
			stripeRefundId: "re_123",
			restock: true,
		});

		expect(result.outcome).toBe("noop");
		expect(mocks.tx.retractationRequest.aggregate).not.toHaveBeenCalled();
		expect(mocks.tx.productVariant.updateMany).not.toHaveBeenCalled();
	});

	it("restock opt-in : increment par variantId, en ignorant les null", async () => {
		await finalizeRetractationRefund({
			retractationId: "ret-1",
			stripeRefundId: "re_123",
			restock: true,
		});

		expect(mocks.tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
		expect(mocks.tx.productVariant.updateMany).toHaveBeenCalledWith({
			where: { id: "variant-a" },
			data: { stock: { increment: 2 } },
		});
	});

	it("collision P2002 : toute la transaction est retentée (transition + numéro ensemble)", async () => {
		mocks.tx.retractationRequest.update
			.mockRejectedValueOnce(new FakePrismaKnownRequestError("P2002"))
			.mockResolvedValueOnce({});

		const result = await finalizeRetractationRefund({
			retractationId: "ret-1",
			stripeRefundId: "re_123",
			restock: false,
		});

		expect(result.outcome).toBe("refunded");
		expect(mocks.$transaction).toHaveBeenCalledTimes(2);
	});

	it("après 3 collisions, l'erreur remonte", async () => {
		mocks.tx.retractationRequest.update.mockRejectedValue(new FakePrismaKnownRequestError("P2002"));

		await expect(
			finalizeRetractationRefund({
				retractationId: "ret-1",
				stripeRefundId: "re_123",
				restock: false,
			}),
		).rejects.toThrow();
		expect(mocks.$transaction).toHaveBeenCalledTimes(3);
	});
});
