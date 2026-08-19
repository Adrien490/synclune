/**
 * @regression cancel-order-stripe-door
 *
 * « Annuler » une commande PENDING ferme la porte Stripe AVANT la transition :
 * une session encore `open` laisserait la cliente payer une commande annulée
 * et restockée (le webhook `completed` tomberait sur count = 0, l'argent serait
 * pris sans commande). Ces tests verrouillent l'ordre expire-avant-transition
 * et chaque branche d'erreur Stripe : `resource_missing` (rien à fermer),
 * session `complete` (refus — la cliente vient de payer), session `expired`
 * (on poursuit), session encore `open` après échec d'expire (refus — état
 * inattendu, on ne restocke PAS).
 */
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { cancelOrder } from "../cancel-order";

const mocks = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	findUnique: vi.fn(),
	expire: vi.fn(),
	retrieve: vi.fn(),
	cancelOrderFromExpiredSession: vi.fn(),
	markOrderPaidFromSession: vi.fn(),
	updateTagsAfterMutation: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { findUnique: mocks.findUnique } },
}));
vi.mock("@/shared/lib/stripe", () => ({
	stripe: { checkout: { sessions: { expire: mocks.expire, retrieve: mocks.retrieve } } },
}));
vi.mock("@/modules/webhooks/services/checkout-session-transitions.service", () => ({
	cancelOrderFromExpiredSession: mocks.cancelOrderFromExpiredSession,
	markOrderPaidFromSession: mocks.markOrderPaidFromSession,
}));
vi.mock("@/shared/lib/cache", () => ({
	updateTagsAfterMutation: mocks.updateTagsAfterMutation,
}));

const ORDER_ID = "k3x9m2p8q1r5s7t0uvwxyz012345";
const SESSION_ID = "cs_test_a1b2c3";
const TAGS = ["admin-orders-list", `admin-order-detail-${ORDER_ID}`];

// Convention du dépôt : une erreur mockée est une VRAIE instance de la classe
// attendue (un `Object.assign(new Error(), { code })` n'est pas `instanceof`).
function stripeInvalidRequestError(code: string): Stripe.errors.StripeInvalidRequestError {
	return new Stripe.errors.StripeInvalidRequestError({
		code,
		type: "invalid_request_error",
		message: `Stripe refused: ${code}`,
	});
}

function makeFormData(entries: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) formData.set(key, value);
	return formData;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.findUnique.mockResolvedValue({ stripeSessionId: SESSION_ID, status: "PENDING" });
	mocks.expire.mockResolvedValue({ status: "expired" });
	mocks.cancelOrderFromExpiredSession.mockResolvedValue({
		outcome: "transitioned",
		orderId: ORDER_ID,
		tags: TAGS,
	});
});

describe("cancelOrder", () => {
	it("refuse sans session admin, sans lire la base", async () => {
		mocks.requireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mocks.findUnique).not.toHaveBeenCalled();
	});

	it("valide l'entrée AVANT toute lecture (orderId invalide)", async () => {
		const result = await cancelOrder(undefined, makeFormData({ orderId: "pas-un-cuid!" }));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.findUnique).not.toHaveBeenCalled();
	});

	it("commande inconnue : NOT_FOUND avec un message grammatical (pas « introuvable. non trouvé »)", async () => {
		mocks.findUnique.mockResolvedValue(null);

		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		// `notFound()` suffixe « non trouvé(e) » : passer une phrase complète
		// produisait « Commande introuvable. non trouvé » (corrigé 2026-08-19).
		expect(result.message).toBe("Commande non trouvée");
		expect(mocks.expire).not.toHaveBeenCalled();
	});

	it("commande non-PENDING : erreur, Stripe jamais appelé, aucune transition", async () => {
		mocks.findUnique.mockResolvedValue({ stripeSessionId: SESSION_ID, status: "PAID" });

		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.expire).not.toHaveBeenCalled();
		expect(mocks.cancelOrderFromExpiredSession).not.toHaveBeenCalled();
	});

	it("nominal : session expirée PUIS transition + restock, tags invalidés", async () => {
		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.expire).toHaveBeenCalledWith(SESSION_ID);
		expect(mocks.cancelOrderFromExpiredSession).toHaveBeenCalledWith(SESSION_ID);
		// L'ordre est l'invariant : la porte Stripe se ferme AVANT la transition.
		expect(mocks.expire.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.cancelOrderFromExpiredSession.mock.invocationCallOrder[0]!,
		);
		expect(mocks.updateTagsAfterMutation).toHaveBeenCalledWith(TAGS);
	});

	it("placeholder `pending_…` (création de session échouée) : annulation directe, Stripe jamais appelé", async () => {
		mocks.findUnique.mockResolvedValue({ stripeSessionId: "pending_abc123", status: "PENDING" });
		mocks.cancelOrderFromExpiredSession.mockResolvedValue({
			outcome: "transitioned",
			orderId: ORDER_ID,
			tags: TAGS,
		});

		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.expire).not.toHaveBeenCalled();
		expect(mocks.retrieve).not.toHaveBeenCalled();
		expect(mocks.cancelOrderFromExpiredSession).toHaveBeenCalledWith("pending_abc123");
	});

	it("expire → `resource_missing` (session d'un autre environnement) : rien à fermer, on annule quand même", async () => {
		mocks.expire.mockRejectedValue(stripeInvalidRequestError("resource_missing"));

		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.retrieve).not.toHaveBeenCalled();
		expect(mocks.cancelOrderFromExpiredSession).toHaveBeenCalledWith(SESSION_ID);
	});

	it("expire échoue + session `complete` : la cliente vient de payer — refus, AUCUNE transition", async () => {
		mocks.expire.mockRejectedValue(stripeInvalidRequestError("checkout_session_not_open"));
		mocks.retrieve.mockResolvedValue({ status: "complete" });

		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("vient de payer");
		expect(mocks.cancelOrderFromExpiredSession).not.toHaveBeenCalled();
	});

	it("expire échoue + session `expired` (course avec le webhook) : on poursuit l'annulation", async () => {
		mocks.expire.mockRejectedValue(stripeInvalidRequestError("checkout_session_not_open"));
		mocks.retrieve.mockResolvedValue({ status: "expired" });

		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.cancelOrderFromExpiredSession).toHaveBeenCalledWith(SESSION_ID);
	});

	it("expire échoue + session encore `open` : refus — annuler restockerait une commande encore payable", async () => {
		mocks.expire.mockRejectedValue(stripeInvalidRequestError("lock_timeout"));
		mocks.retrieve.mockResolvedValue({ status: "open" });

		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.cancelOrderFromExpiredSession).not.toHaveBeenCalled();
		expect(mocks.updateTagsAfterMutation).not.toHaveBeenCalled();
	});

	it("transition no-op (webhook passé entre-temps) : erreur propre, pas de tags", async () => {
		mocks.cancelOrderFromExpiredSession.mockResolvedValue({
			outcome: "noop",
			orderId: null,
			tags: [],
		});

		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.updateTagsAfterMutation).not.toHaveBeenCalled();
	});

	it("erreur Stripe transiente (non InvalidRequest) : erreur générique, AUCUNE transition", async () => {
		mocks.expire.mockRejectedValue(
			new Stripe.errors.StripeConnectionError({
				type: "api_error",
				message: "Network failure",
			}),
		);

		const result = await cancelOrder(undefined, makeFormData({ orderId: ORDER_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.retrieve).not.toHaveBeenCalled();
		expect(mocks.cancelOrderFromExpiredSession).not.toHaveBeenCalled();
	});
});
