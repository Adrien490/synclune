/**
 * @regression order-transition-guards
 *
 * « Corriger le n° de suivi » est un `updateMany` gardé sur `status: "SHIPPED"` :
 * il ne s'applique qu'à une commande déjà expédiée (une PAID passe par
 * « Marquer expédiée », une REFUNDED n'est plus modifiable). Le renvoi d'email
 * est STRICTEMENT opt-in — corriger sans cocher ne renvoie rien.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTrackingNumber } from "../update-tracking-number";

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
		trackingNumber: "6A12345678901",
		shippedAt: new Date("2026-08-15T10:00:00Z"),
		shippingLine1: "1 rue Test",
		shippingLine2: null,
		shippingZip: "44000",
		shippingCity: "Nantes",
		shippingCountry: "FR",
	});
});

describe("updateTrackingNumber", () => {
	it("remplace le numéro, gardé sur le statut SHIPPED, sans email si non demandé", async () => {
		mocks.updateMany.mockResolvedValue({ count: 1 });

		const result = await updateTrackingNumber(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "6A12345678901",
				resendEmail: "",
			}),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.updateMany).toHaveBeenCalledWith({
			where: { id: ORDER_ID, status: "SHIPPED" },
			data: { trackingNumber: "6A12345678901" },
		});
		expect(mocks.sendShippingConfirmationEmail).not.toHaveBeenCalled();
		expect(mocks.updateTagsAfterMutation).toHaveBeenCalledTimes(1);
	});

	it("renvoie l'email rectifié quand la case est cochée", async () => {
		mocks.updateMany.mockResolvedValue({ count: 1 });

		const result = await updateTrackingNumber(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "6A12345678901",
				resendEmail: "on",
			}),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.sendShippingConfirmationEmail).toHaveBeenCalledTimes(1);
	});

	it("count = 0 (commande PAID, remboursée…) : erreur, AUCUN email", async () => {
		mocks.updateMany.mockResolvedValue({ count: 0 });

		const result = await updateTrackingNumber(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "6A12345678901",
				resendEmail: "on",
			}),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.sendShippingConfirmationEmail).not.toHaveBeenCalled();
	});

	it("valide l'entrée AVANT toute écriture (tracking trop court)", async () => {
		const result = await updateTrackingNumber(
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

		const result = await updateTrackingNumber(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "6A12345678901",
			}),
		);

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mocks.updateMany).not.toHaveBeenCalled();
	});

	it("renvoi demandé mais commande sans email : succès qui ne prétend pas avoir prévenu", async () => {
		mocks.updateMany.mockResolvedValue({ count: 1 });
		mocks.findUnique.mockResolvedValue({
			id: ORDER_ID,
			invoiceNumber: 1,
			email: "",
			customerName: null,
			trackingNumber: "6A12345678901",
			shippedAt: new Date("2026-08-15T10:00:00Z"),
			shippingLine1: null,
			shippingLine2: null,
			shippingZip: null,
			shippingCity: null,
			shippingCountry: null,
		});

		const result = await updateTrackingNumber(
			undefined,
			makeFormData({
				orderId: ORDER_ID,
				trackingNumber: "6A12345678901",
				resendEmail: "on",
			}),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.sendShippingConfirmationEmail).not.toHaveBeenCalled();
		expect(result.message).toContain("PAS été prévenue");
	});
});
