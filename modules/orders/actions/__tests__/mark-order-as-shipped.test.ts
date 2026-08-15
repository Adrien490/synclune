/**
 * @regression order-transition-guards
 *
 * Les transitions admin sont des `updateMany` gardés sur le statut SOURCE :
 * « Marquer expédiée » n'agit que sur une commande PAID. Un double clic, une
 * commande annulée entre-temps ou un id d'une commande PENDING rendent
 * count = 0 → erreur propre, AUCUN email, jamais d'écrasement de statut
 * (SHIPPED impossible depuis PENDING).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { markOrderAsShipped } from "../mark-order-as-shipped";

const mocks = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	updateMany: vi.fn(),
	findUnique: vi.fn(),
	sendShippingConfirmationEmail: vi.fn(),
	updateTagsAfterMutation: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { updateMany: mocks.updateMany, findUnique: mocks.findUnique } },
}));
vi.mock("@/modules/emails/services/send-shipping-confirmation", () => ({
	sendShippingConfirmationEmail: mocks.sendShippingConfirmationEmail,
}));
vi.mock("@/shared/lib/cache", () => ({
	updateTagsAfterMutation: mocks.updateTagsAfterMutation,
}));

const ORDER_ID = "k3x9m2p8q1r5s7t0uvwxyz012345";

function makeFormData(entries: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) formData.set(key, value);
	return formData;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.sendShippingConfirmationEmail.mockResolvedValue({ success: true, data: { id: "e" } });
	mocks.findUnique.mockResolvedValue({
		id: ORDER_ID,
		invoiceNumber: 1,
		email: "cliente@example.com",
		customerName: "Marie",
		trackingNumber: "8N00234567890",
		shippedAt: new Date("2026-08-15T10:00:00Z"),
		shippingLine1: "1 rue Test",
		shippingLine2: null,
		shippingZip: "44000",
		shippingCity: "Nantes",
		shippingCountry: "FR",
	});
});

describe("markOrderAsShipped", () => {
	it("PAID→SHIPPED : updateMany gardé sur le statut source + email envoyé", async () => {
		mocks.updateMany.mockResolvedValue({ count: 1 });

		const result = await markOrderAsShipped(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "8N00234567890",
			}),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.updateMany).toHaveBeenCalledWith({
			where: { id: ORDER_ID, status: "PAID" },
			data: expect.objectContaining({
				status: "SHIPPED",
				trackingNumber: "8N00234567890",
				shippedAt: expect.any(Date),
			}),
		});
		expect(mocks.sendShippingConfirmationEmail).toHaveBeenCalledTimes(1);
		expect(mocks.updateTagsAfterMutation).toHaveBeenCalledTimes(1);
	});

	it("count = 0 (commande PENDING, annulée, ou déjà expédiée) : erreur, AUCUN email", async () => {
		mocks.updateMany.mockResolvedValue({ count: 0 });

		const result = await markOrderAsShipped(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "8N00234567890",
			}),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.sendShippingConfirmationEmail).not.toHaveBeenCalled();
	});

	it("valide l'entrée AVANT toute écriture (tracking trop court)", async () => {
		const result = await markOrderAsShipped(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "ab",
			}),
		);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.updateMany).not.toHaveBeenCalled();
	});

	it("refuse sans session admin", async () => {
		mocks.requireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await markOrderAsShipped(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "8N00234567890",
			}),
		);

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mocks.updateMany).not.toHaveBeenCalled();
	});

	it("commande sans email : transition acquise, AUCUN envoi, et le message ne prétend pas le contraire", async () => {
		mocks.updateMany.mockResolvedValue({ count: 1 });
		mocks.findUnique.mockResolvedValue({
			id: ORDER_ID,
			invoiceNumber: 1,
			email: "",
			customerName: null,
			trackingNumber: "8N00234567890",
			shippedAt: new Date("2026-08-15T10:00:00Z"),
			shippingLine1: null,
			shippingLine2: null,
			shippingZip: null,
			shippingCity: null,
			shippingCountry: null,
		});

		const result = await markOrderAsShipped(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "8N00234567890",
			}),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.sendShippingConfirmationEmail).not.toHaveBeenCalled();
		// Avant correction, ce chemin renvoyait « Commande expédiée, email envoyé
		// à la cliente » — un mensonge : personne n'était prévenu.
		expect(result.message).not.toContain("email envoyé");
		expect(result.message).toContain("PAS été prévenue");
	});

	it("email en échec : la transition reste acquise, le message le dit", async () => {
		mocks.updateMany.mockResolvedValue({ count: 1 });
		mocks.sendShippingConfirmationEmail.mockResolvedValue({
			success: false,
			error: new Error("Resend down"),
		});

		const result = await markOrderAsShipped(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "8N00234567890",
			}),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("email");
	});
});
