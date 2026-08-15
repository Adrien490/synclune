/**
 * `createCheckoutSession` — l'orchestrateur du chemin de l'argent (audit
 * 2026-08-15, F1). Les services purs et la transaction de réservation ont leurs
 * propres suites ; ICI on fige ce que seule l'action décide :
 *
 *  - l'ordre des gardes d'entrée (parse pays AVANT tout, panier vide,
 *    disponibilité, plafond par commande ≠ stock insuffisant) ;
 *  - le rollback compensatoire : appelé avec les lignes EXACTES quand Stripe
 *    échoue, et son propre échec loggé sans jamais remonter (la cliente reçoit
 *    une erreur affichable, la réconciliation admin résorbe le vestige) ;
 *  - le verrouillage de la session sur le pays choisi + l'idempotencyKey ;
 *  - l'invalidation de cache (stock décrémenté → vitrine et admin) et le
 *    redirect final, HORS try/catch.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessError } from "@/shared/lib/actions";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { getVariantInvalidationTags } from "@/modules/variants/utils/cache.utils";
import {
	buildOrderLines,
	buildStripeLineItems,
	computeOrderAmounts,
} from "../../services/checkout-order.service";

const mocks = vi.hoisted(() => ({
	redirect: vi.fn((url: string): never => {
		throw new Error(`NEXT_REDIRECT:${url}`);
	}),
	readCartCookie: vi.fn(),
	prisma: {
		productVariant: { findMany: vi.fn() },
		order: { update: vi.fn() },
	},
	sessionsCreate: vi.fn(),
	updateTagsAfterMutation: vi.fn(),
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
	reserveStockAndCreateOrder: vi.fn(),
	releaseReservation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: mocks.redirect,
	// no-op : aucun signal framework réel ne traverse ces tests (le redirect
	// mocké est appelé HORS try/catch, unstable_rethrow ne le voit jamais).
	unstable_rethrow: () => {},
}));
vi.mock("@/modules/cart/lib/cart-cookie", () => ({ readCartCookie: mocks.readCartCookie }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/shared/lib/stripe", () => ({
	stripe: { checkout: { sessions: { create: mocks.sessionsCreate } } },
	withStripeCircuitBreaker: (fn: () => Promise<unknown>) => fn(),
}));
vi.mock("@/shared/lib/cache", () => ({ updateTagsAfterMutation: mocks.updateTagsAfterMutation }));
vi.mock("@/shared/lib/logger", () => ({ logger: mocks.logger }));
vi.mock("../../services/checkout-reservation.service", () => ({
	reserveStockAndCreateOrder: mocks.reserveStockAndCreateOrder,
	releaseReservation: mocks.releaseReservation,
}));

import { createCheckoutSession } from "../create-checkout-session";

// ============================================================================
// FIXTURES
// ============================================================================

/** Forme exacte de CART_VARIANT_SELECT (media : IMAGE seule, take 1). */
function makeVariant(overrides?: {
	id?: string;
	stock?: number;
	active?: boolean;
	productActive?: boolean;
	priceCents?: number | null;
}) {
	return {
		id: overrides?.id ?? "variant-1",
		priceCents: overrides?.priceCents ?? null,
		stock: overrides?.stock ?? 3,
		active: overrides?.active ?? true,
		size: "18cm",
		color: { id: "color-1", name: "Rose bonbon", hex: "#f4a6c8" },
		material: { id: "material-1", name: "Acier inoxydable" },
		product: {
			id: "product-1",
			name: "Collier goutte arc-en-ciel",
			slug: "collier-goutte-arc-en-ciel",
			active: overrides?.productActive ?? true,
			priceCents: 3800,
			media: [{ id: "media-1", url: "https://example.com/photo.jpg", alt: null, type: "IMAGE" }],
		},
	};
}

function makeFormData(country: string): FormData {
	const formData = new FormData();
	formData.set("country", country);
	return formData;
}

function makeCookie(quantity = 2) {
	return { items: [{ variantId: "variant-1", quantity, priceAtAdd: 3800 }] };
}

/** Lignes/montants attendus, calculés par les MÊMES services purs que l'action. */
function expectedOrderData(variant = makeVariant(), quantity = 2, shippingCents = 499) {
	const lines = buildOrderLines([{ quantity, variant }]);
	return { lines, amounts: computeOrderAmounts(lines, shippingCents) };
}

async function run(country = "FR"): Promise<ActionState> {
	return createCheckoutSession(undefined, makeFormData(country));
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.readCartCookie.mockResolvedValue(makeCookie());
	mocks.prisma.productVariant.findMany.mockResolvedValue([makeVariant()]);
	mocks.prisma.order.update.mockResolvedValue({ id: "order-1" });
	mocks.reserveStockAndCreateOrder.mockResolvedValue({ orderId: "order-1" });
	mocks.releaseReservation.mockResolvedValue(undefined);
	mocks.sessionsCreate.mockResolvedValue({
		id: "cs_test_123",
		url: "https://checkout.stripe.com/pay/cs_test_123",
	});
});

// ============================================================================
// GARDES D'ENTRÉE
// ============================================================================

describe("gardes d'entrée", () => {
	it("rejette un pays hors périmètre AVANT toute lecture (parse d'abord)", async () => {
		const state = await run("US");

		expect(state.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.readCartCookie).not.toHaveBeenCalled();
		expect(mocks.prisma.productVariant.findMany).not.toHaveBeenCalled();
	});

	it("refuse un panier vide", async () => {
		mocks.readCartCookie.mockResolvedValue({ items: [] });

		const state = await run();

		expect(state.message).toBe("Ton panier est vide.");
		expect(mocks.reserveStockAndCreateOrder).not.toHaveBeenCalled();
	});

	it("signale une variante disparue de la base sans divulguer d'identifiant", async () => {
		mocks.prisma.productVariant.findMany.mockResolvedValue([]);

		const state = await run();

		expect(state.message).toContain("« Un article » n'est plus disponible");
	});

	it("signale une variante désactivée par son nom de produit", async () => {
		mocks.prisma.productVariant.findMany.mockResolvedValue([makeVariant({ active: false })]);

		const state = await run();

		expect(state.message).toContain("« Collier goutte arc-en-ciel » n'est plus disponible");
	});

	it("plafond par commande : message dédié, PAS « stock insuffisant », aucune réservation", async () => {
		mocks.readCartCookie.mockResolvedValue(makeCookie(11));
		mocks.prisma.productVariant.findMany.mockResolvedValue([makeVariant({ stock: 50 })]);

		const state = await run();

		expect(state.message).toBe(
			"Maximum 10 exemplaires de « Collier goutte arc-en-ciel » par commande. Réduis la quantité dans ton panier.",
		);
		expect(state.message).not.toContain("Stock insuffisant");
		expect(mocks.reserveStockAndCreateOrder).not.toHaveBeenCalled();
	});

	it("stock insuffisant au pré-check : message stock, aucune réservation", async () => {
		mocks.prisma.productVariant.findMany.mockResolvedValue([makeVariant({ stock: 1 })]);

		const state = await run();

		expect(state.message).toBe(
			"Stock insuffisant pour « Collier goutte arc-en-ciel ». Mets ton panier à jour.",
		);
		expect(mocks.reserveStockAndCreateOrder).not.toHaveBeenCalled();
	});
});

// ============================================================================
// RÉSERVATION
// ============================================================================

describe("réservation", () => {
	it("réserve avec les lignes snapshots et les montants recalculés en base", async () => {
		await expect(run()).rejects.toThrow("NEXT_REDIRECT");

		const { lines, amounts } = expectedOrderData();
		expect(mocks.reserveStockAndCreateOrder).toHaveBeenCalledWith(lines, amounts);
	});

	it("une BusinessError de réservation remonte son message métier, sans session Stripe", async () => {
		mocks.reserveStockAndCreateOrder.mockRejectedValue(
			new BusinessError(
				"Stock insuffisant pour « Collier goutte arc-en-ciel ». Mets ton panier à jour et réessaie.",
				"INSUFFICIENT_STOCK",
			),
		);

		const state = await run();

		expect(state.status).toBe(ActionStatus.ERROR);
		expect(state.message).toBe(
			"Stock insuffisant pour « Collier goutte arc-en-ciel ». Mets ton panier à jour et réessaie.",
		);
		expect(mocks.sessionsCreate).not.toHaveBeenCalled();
	});
});

// ============================================================================
// ÉCHEC STRIPE → ROLLBACK COMPENSATOIRE
// ============================================================================

describe("échec Stripe → rollback compensatoire", () => {
	it("restitue la réservation avec les lignes EXACTES et retourne l'erreur générique", async () => {
		mocks.sessionsCreate.mockRejectedValue(new Error("stripe down"));

		const state = await run();

		expect(mocks.releaseReservation).toHaveBeenCalledWith("order-1", [
			{ variantId: "variant-1", quantity: 2 },
		]);
		expect(state.message).toBe(
			"Le paiement est indisponible pour le moment. Réessaie dans quelques minutes.",
		);
		expect(mocks.logger.error).toHaveBeenCalledWith(
			"[createCheckoutSession] Création de session Stripe échouée",
			expect.objectContaining({ orderId: "order-1" }),
		);
		// Rien n'a bougé côté cache ni navigation : le stock est restitué.
		expect(mocks.updateTagsAfterMutation).not.toHaveBeenCalled();
		expect(mocks.redirect).not.toHaveBeenCalled();
	});

	it("une session sans URL prend le même chemin (rollback, pas d'ancrage du sessionId)", async () => {
		mocks.sessionsCreate.mockResolvedValue({ id: "cs_test_123", url: null });

		const state = await run();

		expect(mocks.releaseReservation).toHaveBeenCalledWith("order-1", [
			{ variantId: "variant-1", quantity: 2 },
		]);
		expect(mocks.prisma.order.update).not.toHaveBeenCalled();
		expect(state.status).toBe(ActionStatus.ERROR);
	});

	it("un rollback qui échoue est loggé et ne remonte JAMAIS (vestige pending_ assumé)", async () => {
		mocks.sessionsCreate.mockRejectedValue(new Error("stripe down"));
		mocks.releaseReservation.mockRejectedValue(new Error("db down"));

		const state = await run();

		expect(state.status).toBe(ActionStatus.ERROR);
		expect(mocks.logger.error).toHaveBeenCalledWith(
			"[createCheckoutSession] Rollback compensatoire échoué",
			expect.objectContaining({ orderId: "order-1" }),
		);
	});
});

// ============================================================================
// SUCCÈS
// ============================================================================

describe("succès", () => {
	it("verrouille la session sur le pays choisi, en price_data inline eur, avec idempotencyKey", async () => {
		const before = Math.floor(Date.now() / 1000);
		await expect(run()).rejects.toThrow("NEXT_REDIRECT");

		const [params, options] = mocks.sessionsCreate.mock.calls[0] ?? [];
		expect(params).toMatchObject({
			mode: "payment",
			locale: "fr",
			shipping_address_collection: { allowed_countries: ["FR"] },
			metadata: { orderId: "order-1" },
			client_reference_id: "order-1",
		});
		expect(params.line_items).toEqual(buildStripeLineItems(expectedOrderData().lines));
		// TTL ~31 min : marge d'une minute au-dessus du minimum Stripe de 30.
		expect(params.expires_at).toBeGreaterThanOrEqual(before + 30 * 60);
		expect(params.expires_at).toBeLessThanOrEqual(before + 32 * 60);
		// Le client Stripe rejoue sur erreur réseau (maxNetworkRetries) : la clé
		// évite qu'un retry crée une session orpheline.
		expect(options).toEqual({ idempotencyKey: "checkout-session-order-1" });
	});

	it("le pays UE fixe le port UE et la seule adresse acceptée", async () => {
		await expect(run("DE")).rejects.toThrow("NEXT_REDIRECT");

		const [params] = mocks.sessionsCreate.mock.calls[0] ?? [];
		expect(params.shipping_address_collection).toEqual({ allowed_countries: ["DE"] });
		expect(params.shipping_options[0].shipping_rate_data.fixed_amount).toEqual({
			amount: 950,
			currency: "eur",
		});
	});

	it("ancre le sessionId réel, invalide vitrine + admin, puis redirige vers Stripe", async () => {
		await expect(run()).rejects.toThrow(
			"NEXT_REDIRECT:https://checkout.stripe.com/pay/cs_test_123",
		);

		expect(mocks.prisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { stripeSessionId: "cs_test_123" },
		});

		// Le stock a bougé : les tags viennent de la MÊME SSOT que les mutations
		// de variantes, plus les listes admin.
		const [tags] = mocks.updateTagsAfterMutation.mock.calls[0] ?? [];
		const tagSet = new Set(tags as Iterable<string>);
		expect(tagSet.has(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST)).toBe(true);
		expect(tagSet.has(SHARED_CACHE_TAGS.ADMIN_BADGES)).toBe(true);
		for (const tag of getVariantInvalidationTags({
			variantId: "variant-1",
			productId: "product-1",
			productSlug: "collier-goutte-arc-en-ciel",
		})) {
			expect(tagSet.has(tag)).toBe(true);
		}

		expect(mocks.redirect).toHaveBeenCalledWith("https://checkout.stripe.com/pay/cs_test_123");
	});
});
