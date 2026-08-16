/**
 * @regression retractation-admin-transition-guards
 *
 * « Colis reçu » est un `updateMany` gardé sur le statut SOURCE
 * (RECEIVED/ACKNOWLEDGED — RECEIVED accepté : si l'accusé a échoué, le colis
 * peut pourtant arriver). Un double clic, une demande déjà traitée ou un id
 * inconnu rendent count = 0 → erreur propre, jamais d'écrasement d'état.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { markReturnReceived } from "../mark-return-received";

const mocks = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	updateMany: vi.fn(),
	findUnique: vi.fn(),
	updateTagsAfterMutation: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		retractationRequest: { updateMany: mocks.updateMany, findUnique: mocks.findUnique },
	},
}));
vi.mock("@/shared/lib/cache", () => ({
	updateTagsAfterMutation: mocks.updateTagsAfterMutation,
}));

const RETRACTATION_ID = "k3x9m2p8q1r5s7t0uvwxyz012345";

function makeFormData(entries: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) formData.set(key, value);
	return formData;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.updateMany.mockResolvedValue({ count: 1 });
	mocks.findUnique.mockResolvedValue({ orderId: "order-1" });
});

describe("markReturnReceived", () => {
	it("RECEIVED/ACKNOWLEDGED → AWAITING_RETURN : updateMany gardé + itemReceivedAt + invalidation", async () => {
		const result = await markReturnReceived(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.updateMany).toHaveBeenCalledWith({
			where: { id: RETRACTATION_ID, status: { in: ["RECEIVED", "ACKNOWLEDGED"] } },
			data: { status: "AWAITING_RETURN", itemReceivedAt: expect.any(Date) },
		});
		expect(mocks.updateTagsAfterMutation).toHaveBeenCalledTimes(1);
	});

	it("count = 0 sur une demande existante (déjà traitée) : erreur, pas de notFound", async () => {
		mocks.updateMany.mockResolvedValue({ count: 0 });
		mocks.findUnique.mockResolvedValue({ id: RETRACTATION_ID });

		const result = await markReturnReceived(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.updateTagsAfterMutation).not.toHaveBeenCalled();
	});

	it("count = 0 sur un id inconnu : NOT_FOUND", async () => {
		mocks.updateMany.mockResolvedValue({ count: 0 });
		mocks.findUnique.mockResolvedValue(null);

		const result = await markReturnReceived(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("valide l'entrée AVANT toute écriture (id malformé)", async () => {
		const result = await markReturnReceived(
			undefined,
			makeFormData({ retractationId: "pas-un-cuid" }),
		);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.updateMany).not.toHaveBeenCalled();
	});

	it("refuse sans session admin", async () => {
		mocks.requireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await markReturnReceived(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mocks.updateMany).not.toHaveBeenCalled();
	});
});
