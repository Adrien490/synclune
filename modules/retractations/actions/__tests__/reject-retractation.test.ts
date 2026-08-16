/**
 * @regression retractation-admin-transition-guards
 *
 * « Rejeter » : `updateMany` gardé sur les statuts sources non remboursés
 * (jamais de retour arrière depuis REFUNDED), motif REQUIS ≥ 10 caractères
 * (il part dans l'email, non persisté), et le message final ne prétend
 * « informée par email » que si l'email est parti.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { rejectRetractation } from "../reject-retractation";

const mocks = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	updateMany: vi.fn(),
	findUnique: vi.fn(),
	sendRetractationRejectedEmail: vi.fn(),
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
vi.mock("@/modules/emails/services/send-retractation-emails", () => ({
	sendRetractationRejectedEmail: mocks.sendRetractationRejectedEmail,
}));
vi.mock("@/shared/lib/cache", () => ({
	updateTagsAfterMutation: mocks.updateTagsAfterMutation,
}));

const RETRACTATION_ID = "k3x9m2p8q1r5s7t0uvwxyz012345";
const REASON = "Demande hors délai légal de quatorze jours.";

const RETRACTATION = {
	orderId: "order-1",
	order: { id: "order-1", invoiceNumber: 12, email: "cliente@example.com", customerName: "Marie" },
};

function makeFormData(entries: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) formData.set(key, value);
	return formData;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.updateMany.mockResolvedValue({ count: 1 });
	mocks.findUnique.mockResolvedValue(RETRACTATION);
	mocks.sendRetractationRejectedEmail.mockResolvedValue({ success: true, data: { id: "e" } });
});

describe("rejectRetractation", () => {
	it("REJECTED gardé sur les statuts sources non remboursés + email avec le motif", async () => {
		const result = await rejectRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID, adminReason: REASON }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.updateMany).toHaveBeenCalledWith({
			where: {
				id: RETRACTATION_ID,
				status: { in: ["RECEIVED", "ACKNOWLEDGED", "AWAITING_RETURN"] },
			},
			data: { status: "REJECTED" },
		});
		expect(mocks.sendRetractationRejectedEmail).toHaveBeenCalledWith({
			order: RETRACTATION.order,
			rejectionReason: REASON,
		});
		expect(mocks.updateTagsAfterMutation).toHaveBeenCalledTimes(1);
	});

	it("motif < 10 caractères : validation error, AUCUNE écriture", async () => {
		const result = await rejectRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID, adminReason: "trop cour" }),
		);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.updateMany).not.toHaveBeenCalled();
	});

	it("count = 0 (déjà remboursée ou rejetée) : erreur, AUCUN email", async () => {
		mocks.updateMany.mockResolvedValue({ count: 0 });
		mocks.findUnique.mockResolvedValue({ id: RETRACTATION_ID });

		const result = await rejectRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID, adminReason: REASON }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.sendRetractationRejectedEmail).not.toHaveBeenCalled();
	});

	it("count = 0 sur un id inconnu : NOT_FOUND", async () => {
		mocks.updateMany.mockResolvedValue({ count: 0 });
		mocks.findUnique.mockResolvedValue(null);

		const result = await rejectRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID, adminReason: REASON }),
		);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("email en échec : le rejet reste acquis, le message le dit", async () => {
		mocks.sendRetractationRejectedEmail.mockResolvedValue({
			success: false,
			error: new Error("Resend down"),
		});

		const result = await rejectRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID, adminReason: REASON }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("n'est pas parti");
		expect(result.message).not.toContain("informée par email");
	});

	it("commande sans email : AUCUN envoi, et le message ne prétend pas le contraire", async () => {
		mocks.findUnique.mockResolvedValue({
			...RETRACTATION,
			order: { ...RETRACTATION.order, email: "" },
		});

		const result = await rejectRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID, adminReason: REASON }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.sendRetractationRejectedEmail).not.toHaveBeenCalled();
		expect(result.message).not.toContain("informée par email");
	});

	it("refuse sans session admin", async () => {
		mocks.requireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await rejectRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID, adminReason: REASON }),
		);

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mocks.updateMany).not.toHaveBeenCalled();
	});
});
