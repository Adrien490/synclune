/**
 * @regression reconcile-pending-orders-branches
 *
 * « Vérifier les commandes en attente » est le remplaçant des crons : il
 * applique l'état RÉEL de chaque session Stripe aux commandes PENDING > 24 h.
 * Ces tests verrouillent les cinq branches : placeholder `pending_…` (annulé
 * sans interroger Stripe), session inconnue (`resource_missing` → annulé),
 * payée (→ PAID), expirée (→ CANCELLED + restock), encore ouverte (on ne
 * touche à RIEN — la cliente peut encore payer) — plus l'agrégation dédupliquée
 * des tags et l'invite à recliquer quand le batch de 25 est plein.
 */
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { reconcilePendingOrders } from "../reconcile-pending-orders";

const mocks = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	findMany: vi.fn(),
	retrieve: vi.fn(),
	cancelOrderFromExpiredSession: vi.fn(),
	markOrderPaidFromSession: vi.fn(),
	updateTagsAfterMutation: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { findMany: mocks.findMany } },
}));
vi.mock("@/shared/lib/stripe", () => ({
	stripe: { checkout: { sessions: { retrieve: mocks.retrieve } } },
}));
vi.mock("@/modules/webhooks/services/checkout-session-transitions.service", () => ({
	cancelOrderFromExpiredSession: mocks.cancelOrderFromExpiredSession,
	markOrderPaidFromSession: mocks.markOrderPaidFromSession,
}));
vi.mock("@/shared/lib/cache", () => ({
	updateTagsAfterMutation: mocks.updateTagsAfterMutation,
}));

function order(id: string, stripeSessionId: string) {
	return { id, stripeSessionId };
}

function transitioned(orderId: string, tags: string[]) {
	return { outcome: "transitioned" as const, orderId, tags };
}

const NOOP = { outcome: "noop" as const, orderId: null, tags: [] };

beforeEach(() => {
	vi.clearAllMocks();
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.findMany.mockResolvedValue([]);
});

describe("reconcilePendingOrders", () => {
	it("refuse sans session admin, sans lire la base", async () => {
		mocks.requireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mocks.findMany).not.toHaveBeenCalled();
	});

	it("aucune commande en attente : succès sans interroger Stripe", async () => {
		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("tout est en ordre");
		expect(mocks.retrieve).not.toHaveBeenCalled();
		expect(mocks.updateTagsAfterMutation).not.toHaveBeenCalled();
	});

	it("placeholder `pending_…` : annulé + restock SANS interroger Stripe", async () => {
		mocks.findMany.mockResolvedValue([order("o1", "pending_abc")]);
		mocks.cancelOrderFromExpiredSession.mockResolvedValue(transitioned("o1", ["t1"]));

		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1 annulée(s)");
		expect(mocks.retrieve).not.toHaveBeenCalled();
		expect(mocks.cancelOrderFromExpiredSession).toHaveBeenCalledWith("pending_abc");
	});

	it("session inconnue de Stripe (resource_missing) : annulé + restock", async () => {
		mocks.findMany.mockResolvedValue([order("o1", "cs_gone")]);
		mocks.retrieve.mockRejectedValue(
			new Stripe.errors.StripeInvalidRequestError({
				code: "resource_missing",
				type: "invalid_request_error",
				message: "No such checkout session",
			}),
		);
		mocks.cancelOrderFromExpiredSession.mockResolvedValue(transitioned("o1", ["t1"]));

		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.cancelOrderFromExpiredSession).toHaveBeenCalledWith("cs_gone");
	});

	it("session payée : la commande passe PAID (même service que le webhook)", async () => {
		const session = { id: "cs_paid", status: "complete", payment_status: "paid" };
		mocks.findMany.mockResolvedValue([order("o1", "cs_paid")]);
		mocks.retrieve.mockResolvedValue(session);
		mocks.markOrderPaidFromSession.mockResolvedValue(transitioned("o1", ["t1"]));

		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1 confirmée(s)");
		expect(mocks.markOrderPaidFromSession).toHaveBeenCalledWith(session);
		expect(mocks.cancelOrderFromExpiredSession).not.toHaveBeenCalled();
	});

	it("session expirée : annulée + restock", async () => {
		mocks.findMany.mockResolvedValue([order("o1", "cs_exp")]);
		mocks.retrieve.mockResolvedValue({ id: "cs_exp", status: "expired" });
		mocks.cancelOrderFromExpiredSession.mockResolvedValue(transitioned("o1", ["t1"]));

		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1 annulée(s)");
	});

	it("session encore ouverte : on ne touche à RIEN (la cliente peut encore payer)", async () => {
		mocks.findMany.mockResolvedValue([order("o1", "cs_open")]);
		mocks.retrieve.mockResolvedValue({ id: "cs_open", status: "open", payment_status: "unpaid" });

		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1 encore ouverte(s)");
		expect(mocks.cancelOrderFromExpiredSession).not.toHaveBeenCalled();
		expect(mocks.markOrderPaidFromSession).not.toHaveBeenCalled();
		expect(mocks.updateTagsAfterMutation).not.toHaveBeenCalled();
	});

	it("tags agrégés et DÉDUPLIQUÉS sur tout le batch, une seule invalidation", async () => {
		mocks.findMany.mockResolvedValue([order("o1", "cs_1"), order("o2", "cs_2")]);
		mocks.retrieve.mockResolvedValue({ status: "expired" });
		mocks.cancelOrderFromExpiredSession
			.mockResolvedValueOnce(transitioned("o1", ["shared-tag", "detail-o1"]))
			.mockResolvedValueOnce(transitioned("o2", ["shared-tag", "detail-o2"]));

		await reconcilePendingOrders(undefined, new FormData());

		expect(mocks.updateTagsAfterMutation).toHaveBeenCalledTimes(1);
		const tags = mocks.updateTagsAfterMutation.mock.calls[0]![0] as Set<string>;
		expect(Array.from(tags).sort()).toEqual(["detail-o1", "detail-o2", "shared-tag"]);
	});

	it("transition no-op (webhook passé entre-temps) : non comptée dans le bilan", async () => {
		mocks.findMany.mockResolvedValue([order("o1", "cs_exp")]);
		mocks.retrieve.mockResolvedValue({ status: "expired" });
		mocks.cancelOrderFromExpiredSession.mockResolvedValue(NOOP);

		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("0 annulée(s)");
		expect(mocks.updateTagsAfterMutation).not.toHaveBeenCalled();
	});

	it("batch plein (25) : le message invite à recliquer — il peut en rester", async () => {
		mocks.findMany.mockResolvedValue(
			Array.from({ length: 25 }, (_, i) => order(`o${i}`, `cs_${i}`)),
		);
		mocks.retrieve.mockResolvedValue({ status: "open", payment_status: "unpaid" });

		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("clique à nouveau");
	});

	it("batch partiel : pas d'invite à recliquer", async () => {
		mocks.findMany.mockResolvedValue([order("o1", "cs_open")]);
		mocks.retrieve.mockResolvedValue({ status: "open", payment_status: "unpaid" });

		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.message).not.toContain("clique à nouveau");
	});

	it("erreur Stripe transiente : l'action échoue proprement (Léane recliquera)", async () => {
		mocks.findMany.mockResolvedValue([order("o1", "cs_1")]);
		mocks.retrieve.mockRejectedValue(
			new Stripe.errors.StripeConnectionError({ type: "api_error", message: "Network failure" }),
		);

		const result = await reconcilePendingOrders(undefined, new FormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.cancelOrderFromExpiredSession).not.toHaveBeenCalled();
	});
});
