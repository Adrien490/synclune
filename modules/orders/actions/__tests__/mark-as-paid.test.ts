import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";
import type * as SharedActions from "@/shared/lib/actions";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSendOrderConfirmationEmail,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		// STOCK-LEDGER-001 : le décrément est passé en `UPDATE … RETURNING` (raw SQL)
		// pour dériver le StockMovement — `productSku.updateMany` n'est plus appelé.
		stockMovement: { create: vi.fn() },
		// Désactivation des SKU tombés à 0 (parité webhook) + résolution des slugs
		// pour l'invalidation stock/catalogue post-commit.
		productSku: {
			findMany: vi.fn().mockResolvedValue([]),
			updateMany: vi.fn().mockResolvedValue({ count: 0 }),
		},
		product: { findMany: vi.fn().mockResolvedValue([]) },
		orderHistory: { create: vi.fn() },
		// STOCK-02 : acquireOrderPaidLockTx fait un tx.$queryRaw (advisory lock).
		$queryRaw: vi.fn(),
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendOrderConfirmationEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
// Stripe est importé dynamiquement par mark-as-paid pour annuler le PaymentIntent
// (best-effort). Mocké ici pour garder le test hermétique — sinon le fixture porteur
// d'un stripePaymentIntentId (EINV-CASH-001) déclenche un vrai appel réseau Stripe.
// EINV-CASH-002 : `retrieve` alimente le préflight de statut PI — "succeeded" par
// défaut (cas webhook perdu, aucune attestation requise) ; les tests EINV-CASH-002
// overrident pour simuler un PI non settled.
const mockPiRetrieve = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		paymentIntents: {
			cancel: vi.fn().mockResolvedValue({ status: "canceled" }),
			retrieve: mockPiRetrieve,
		},
	},
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { MARK_AS_PAID: "admin-mark-paid" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const original = await importOriginal<typeof SharedActions>();
	return {
		...original,
		safeFormGet: (formData: FormData, key: string) => {
			const v = formData.get(key);
			return typeof v === "string" ? v : null;
		},
		handleActionError: mockHandleActionError,
	};
});
vi.mock("@/modules/emails/services/order-emails", () => ({
	sendOrderConfirmationEmail: mockSendOrderConfirmationEmail,
}));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: {
		// `SHOP.ORDER_TRACKING` : le lien client des emails passe par
		// `buildOrderTrackingUrl` depuis le retrait de l'espace client (2026-07-31).
		SHOP: { ORDER_TRACKING: "/suivi-commande" },
		ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` },
	},
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_PAID: "Cette commande est deja payee.",
		CANNOT_PAY_CANCELLED: "Une commande annulee ne peut pas etre marquee comme payee.",
		MARK_AS_PAID_FAILED: "Erreur lors du marquage.",
	},
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../schemas/order.schemas", () => ({
	markAsPaidSchema: {
		safeParse: vi.fn().mockReturnValue({ success: true, data: { id: "test", note: undefined } }),
	},
}));
// EINV-CASH-005 : reconcile-invoices est importé dynamiquement post-commit pour
// l'émission eager (facture + e-reporting). Mocké — sa chaîne d'archivage tire
// UploadThing à l'import.
const mockReconcileInvoiceOrder = vi.hoisted(() => vi.fn());
vi.mock("@/modules/cron/services/reconcile-invoices.service", () => ({
	reconcileInvoiceOrder: mockReconcileInvoiceOrder,
}));

import { markAsPaid } from "../mark-as-paid";
import { markAsPaidSchema } from "../../schemas/order.schemas";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });

function createPendingOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PENDING",
		paymentStatus: "PENDING",
		stripeCheckoutSessionId: null,
		// EINV-CASH-001 : toute Order réelle naît d'un checkout Stripe et porte un
		// PaymentIntent (order-creation.service.ts). Le fixture doit le refléter,
		// sinon le garde `no_stripe_proof` rejette la commande.
		stripePaymentIntentId: "pi_default_test",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("markAsPaid", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		// ⚠️ `resetAllMocks` efface les implémentations posées au hoist : réarmer ici,
		// sinon `findMany` rend `undefined` et la désactivation/invalidation lève.
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.product.findMany.mockResolvedValue([]);

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendOrderConfirmationEmail.mockReturnValue(Promise.resolve());
		mockBuildUrl.mockReturnValue("https://synclune.fr/tracking");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);

		const order = createPendingOrder();
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockPiRetrieve.mockResolvedValue({ status: "succeeded" });
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		// `$queryRaw` sert l'advisory lock (retour ignoré) ET le `UPDATE … RETURNING`
		// du décrément (retour lu). Une ligne retournée = décrément accepté.
		mockPrisma.$queryRaw.mockResolvedValue([{ inventory: 3, productId: "prod-1" }]);
		mockPrisma.stockMovement.create.mockResolvedValue({});
		mockReconcileInvoiceOrder.mockResolvedValue({ kind: "recovered" });

		vi.mocked(markAsPaidSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, note: undefined },
		} as never);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		vi.mocked(markAsPaidSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "ID invalide" }] },
		} as never);
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when order is already paid", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPendingOrder({ paymentStatus: "PAID" }));
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("payee");
	});

	it("should return error when order is cancelled", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPendingOrder({ status: "CANCELLED" }));
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should reject an order without a PaymentIntent (EINV-CASH-001)", async () => {
		// Commande sans PaymentIntent = aucune preuve PSP (le PaymentIntent est l'unique
		// preuve Stripe depuis le retrait du flow Checkout Session hosted).
		// markAsPaid doit refuser (anti encaissement fictif / logiciel de caisse).
		mockPrisma.order.findUnique.mockResolvedValue(
			createPendingOrder({ stripePaymentIntentId: null }),
		);
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/Stripe/i);
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	// EINV-CASH-002 : le préflight interroge le statut LIVE du PI — un PI non
	// settled exige une attestation explicite d'encaissement hors Stripe.
	it("rejects when the PI is not settled and no off-Stripe attestation is given (EINV-CASH-002)", async () => {
		mockPiRetrieve.mockResolvedValue({ status: "requires_payment_method" });

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/hors Stripe/i);
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	it("proceeds on an unsettled PI when the admin attests off-Stripe payment, and records it in the audit trail (EINV-CASH-002)", async () => {
		mockPiRetrieve.mockResolvedValue({ status: "requires_payment_method" });
		vi.mocked(markAsPaidSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, note: undefined, confirmOffStripePayment: true },
		} as never);

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				metadata: expect.objectContaining({
					piStatus: "requires_payment_method",
					offStripeConfirmed: true,
				}),
			}),
		);
	});

	it("fails open when the Stripe API is unavailable, recording piStatus 'unavailable' (EINV-CASH-002)", async () => {
		// Garde anti-erreur pour admin de confiance : un outage Stripe ne doit pas
		// bloquer une recovery légitime — le statut non vérifiable est tracé.
		mockPiRetrieve.mockRejectedValue(new Error("Stripe down"));

		const result = await markAsPaid(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				metadata: expect.objectContaining({ piStatus: "unavailable" }),
			}),
		);
	});

	it("should decrement stock when marking a recoverable order as paid", async () => {
		// Flow Elements : le stock n'est décrémenté qu'au passage à PAID, donc une
		// commande recoverable a toujours son stock à décrémenter ici.
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);

		// STOCK-LEDGER-001 : le décrément est journalisé (source ORDER, delta négatif).
		expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ source: "ORDER", delta: -1 }),
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// Garde anti-survente du décrément manuel.
	//
	// C'est le SEUL décrément de stock déclenché par un humain, et sa condition
	// (`isActive` + `inventory >= quantity`) n'avait AUCUNE couverture
	// comportementale : le mock répondait toujours `{ count: 1 }`, l'unique
	// assertion était `toHaveBeenCalled()`, et le message d'erreur n'apparaissait
	// dans aucun test. Retirer la condition du `WHERE` laissait la suite verte.
	// Audit « validation stock panier » 2026-07-30, P2-1.
	// ─────────────────────────────────────────────────────────────────────────
	describe("garde anti-survente du décrément (P2-1)", () => {
		it("échoue quand le décrément n'affecte aucune ligne (stock insuffisant ou SKU inactif)", async () => {
			// Zéro ligne retournée = la condition du WHERE n'a pas été satisfaite.
			mockPrisma.$queryRaw.mockResolvedValue([]);

			const result = await markAsPaid(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
		});

		it("porte la condition de stock ET d'activité dans le SQL du décrément", async () => {
			await markAsPaid(undefined, validFormData);

			// Le décrément doit rester CONDITIONNEL : sans ces trois fragments, deux
			// encaissements concurrents (ou un stock déjà épuisé) passeraient tous deux
			// et l'inventaire tomberait sous zéro — rattrapé seulement par le CHECK DB,
			// hors de tout chemin d'erreur métier.
			const sql = mockPrisma.$queryRaw.mock.calls
				.map((call) => (Array.isArray(call[0]) ? call[0].join("?") : String(call[0])))
				.join("\n");

			expect(sql).toContain('UPDATE "ProductSku"');
			expect(sql).toContain('"isActive" = true');
			expect(sql).toContain('"inventory" >=');
			expect(sql).toContain("RETURNING");
		});
	});

	// STOCK-02 : la transition PAID doit être sérialisée avec le webhook concurrent
	// via un advisory lock acquis AVANT toute lecture/mutation.
	it("acquires a pg_advisory_xact_lock on the order before mutating (STOCK-02)", async () => {
		await markAsPaid(undefined, validFormData);
		expect(mockPrisma.$queryRaw).toHaveBeenCalled();
		const sql = (mockPrisma.$queryRaw.mock.calls[0]?.[0] as string[] | undefined)?.join("") ?? "";
		expect(sql).toContain("pg_advisory_xact_lock");
	});

	// EINV-CASH-005 : le PI est annulé post-commit (ORD-BIZ-007), donc aucun webhook
	// ne viendra jamais émettre la facture ni l'e-reporting SALES. La transition PAID
	// doit poser les flags DLQ dans la tx (visibilité reconcile-invoices crash-safe)
	// puis tenter l'émission eager (Art. 289-I).
	it("sets both DLQ flags in the PAID transaction so reconcile-invoices can drain on crash (EINV-CASH-005)", async () => {
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					paymentStatus: "PAID",
					invoiceRetryDeferred: true,
				}),
			}),
		);
	});

	it("eagerly reconciles the invoice post-commit (EINV-CASH-005)", async () => {
		const order = createPendingOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockReconcileInvoiceOrder).toHaveBeenCalledWith(order.id);
	});

	it("still succeeds when the eager reconcile fails — the daily cron drains the flags (EINV-CASH-005)", async () => {
		mockReconcileInvoiceOrder.mockRejectedValue(new Error("UploadThing down"));
		const result = await markAsPaid(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await markAsPaid(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
