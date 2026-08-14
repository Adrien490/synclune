/**
 * `retryInvoiceGeneration` est la DLQ facture déclenchée à la main depuis
 * `/admin/ventes/facturation`. Elle n'avait aucun test — nulle part — jusqu'à
 * l'audit « Server Actions sécurisées » du 2026-08-07, alors qu'elle peut poser un
 * `invoiceNumber`, archiver un PDF sous SHA-256 et émettre un avoir : trois
 * écritures conservées dix ans (Art. 286 / 289-I / L102 B).
 *
 * Le point le plus fragile est le DERNIER : l'invalidation. L'action écrit des
 * entrées `OrderHistory` et change l'état facture de la commande ; n'invalider que
 * les tags de LISTE laissait la page détail périmée jusqu'à expiration du profil
 * `user` (~10 min) — le trou historique de ce module (CACHE-AUDIT-010). D'où
 * l'assertion sur `getOrderInvalidationTags`, jamais sur une liste écrite à la main.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockOrderFindUnique,
	mockReconcileInvoiceOrder,
	mockUpdateTag,
	mockGetOrderInvalidationTags,
	mockLogger,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockOrderFindUnique: vi.fn(),
	mockReconcileInvoiceOrder: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { INVOICE_RETRY: { name: "admin", limit: 120, windowMs: 60_000 } },
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { findUnique: mockOrderFindUnique } },
}));
vi.mock("@/modules/cron/services/reconcile-invoices.service", () => ({
	reconcileInvoiceOrder: mockReconcileInvoiceOrder,
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

import { retryInvoiceGeneration } from "../retry-invoice-generation";

// ============================================================================
// HELPERS
// ============================================================================

const ORDER_ID = "cm3order00000123qz8v4h2j";
const AUTH_ERROR = { status: ActionStatus.FORBIDDEN, message: "Accès non autorisé" };
const INVALIDATION_TAGS = ["orders-list", "admin-badges", `order-detail-${ORDER_ID}`];

const call = (orderId: string = ORDER_ID) =>
	retryInvoiceGeneration(undefined, createMockFormData({ orderId }));

function recovered(parts: Partial<Record<string, boolean>> = {}) {
	return {
		kind: "recovered" as const,
		invoiceNumberRecovered: false,
		pdfArchiveRecovered: false,
		creditNoteRecovered: false,
		creditNotePdfRecovered: false,
		...parts,
	};
}

beforeEach(() => {
	vi.resetAllMocks();

	mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
	mockEnforceRateLimit.mockResolvedValue({ success: true });
	mockOrderFindUnique.mockResolvedValue({ id: ORDER_ID });
	mockReconcileInvoiceOrder.mockResolvedValue({ kind: "skipped" });
	mockGetOrderInvalidationTags.mockReturnValue(INVALIDATION_TAGS);
});

// ============================================================================
// TESTS
// ============================================================================

describe("retryInvoiceGeneration", () => {
	describe("garde admin", () => {
		it("rejette un appelant non-admin", async () => {
			mockRequireAdmin.mockResolvedValue({ error: AUTH_ERROR });

			await expect(call()).resolves.toEqual(AUTH_ERROR);
		});

		it("ne lance AUCUNE réconciliation quand la garde rejette", async () => {
			mockRequireAdmin.mockResolvedValue({ error: AUTH_ERROR });

			await call();

			expect(mockReconcileInvoiceOrder).not.toHaveBeenCalled();
			expect(mockOrderFindUnique).not.toHaveBeenCalled();
		});
	});

	describe("rate limit", () => {
		it("borne les clics répétés — l'opération sérialise sur l'advisory lock avoir de l'année", async () => {
			const rateError = { status: ActionStatus.ERROR, message: "Trop de requêtes." };
			mockEnforceRateLimit.mockResolvedValue({ error: rateError });

			await expect(call()).resolves.toEqual(rateError);
			expect(mockReconcileInvoiceOrder).not.toHaveBeenCalled();
		});
	});

	describe("validation", () => {
		it("refuse un orderId qui n'est pas un cuid2", async () => {
			const result = await call("pas-un-cuid");

			expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
			expect(mockReconcileInvoiceOrder).not.toHaveBeenCalled();
		});

		it("refuse un orderId absent du FormData", async () => {
			const result = await retryInvoiceGeneration(undefined, new FormData());

			expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
			expect(mockReconcileInvoiceOrder).not.toHaveBeenCalled();
		});
	});

	describe("commande introuvable", () => {
		it("rend une erreur sans lancer la réconciliation", async () => {
			mockOrderFindUnique.mockResolvedValue(null);

			const result = await call();

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toBe("Commande introuvable");
			expect(mockReconcileInvoiceOrder).not.toHaveBeenCalled();
		});
	});

	describe("issues de la réconciliation", () => {
		it("« recovered » nomme ce qui a été rattrapé", async () => {
			mockReconcileInvoiceOrder.mockResolvedValue(
				recovered({ invoiceNumberRecovered: true, pdfArchiveRecovered: true }),
			);

			const result = await call();

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(result.message).toContain("numéro");
			expect(result.message).toContain("PDF");
			expect(result.message).not.toContain("avoir");
		});

		it("« recovered » sur un avoir le nomme aussi", async () => {
			mockReconcileInvoiceOrder.mockResolvedValue(recovered({ creditNoteRecovered: true }));

			const result = await call();

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(result.message).toContain("avoir");
		});

		it("« failed » renvoie vers Sentry, sans détail technique", async () => {
			mockReconcileInvoiceOrder.mockResolvedValue({ kind: "failed" });

			const result = await call();

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("Sentry");
		});

		it("« skipped » est un succès — l'action est idempotente", async () => {
			mockReconcileInvoiceOrder.mockResolvedValue({ kind: "skipped" });

			const result = await call();

			// Une commande déjà rattrapée entre-temps n'est pas une erreur : c'est le
			// cas nominal d'un second clic.
			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(result.message).toContain("déjà saine");
		});

		it("passe par handleActionError sur exception (aucune fuite technique)", async () => {
			mockReconcileInvoiceOrder.mockRejectedValue(new Error("advisory lock timeout P2024"));

			const result = await call();

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).not.toContain("P2024");
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	describe("invalidation de cache (CACHE-AUDIT-010)", () => {
		it("passe par getOrderInvalidationTags, jamais par une liste écrite à la main", async () => {
			await call();

			expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith(ORDER_ID);
		});

		it("invalide CHACUN des tags rendus par le helper", async () => {
			await call();

			for (const tag of INVALIDATION_TAGS) {
				expect(mockUpdateTag).toHaveBeenCalledWith(tag);
			}
			expect(mockUpdateTag).toHaveBeenCalledTimes(INVALIDATION_TAGS.length);
		});

		it("invalide aussi quand la réconciliation échoue — l'état a pu bouger avant l'échec", async () => {
			mockReconcileInvoiceOrder.mockResolvedValue({ kind: "failed" });

			await call();

			expect(mockUpdateTag).toHaveBeenCalledTimes(INVALIDATION_TAGS.length);
		});

		it("n'invalide RIEN quand la commande est introuvable", async () => {
			mockOrderFindUnique.mockResolvedValue(null);

			await call();

			expect(mockUpdateTag).not.toHaveBeenCalled();
		});
	});
});
