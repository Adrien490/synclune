/**
 * @regression ORD-BIZ-012
 *
 * Garantit que `markAsShipped` distingue dans l'audit trail l'intention
 * d'envoyer un email (`emailRequested`) du résultat réel. Si l'envoi Resend
 * échoue après commit, une 2e entrée OrderHistory est créée avec
 * `metadata.emailDeliveryFailed: true`.
 *
 * Sans cette régression : `metadata.emailSent: true` est posé dans l'audit
 * initial avant l'envoi réel → audit faussement positif si l'envoi échoue.
 *
 * Note : `markAsDelivered` n'envoie plus aucun email (email de confirmation de
 * livraison supprimé) — le volet livraison de cette régression a donc été retiré.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";
import type * as SharedActions from "@/shared/lib/actions";

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSendShippingEmail,
	mockCreateOrderAuditTx,
	mockCreateOrderAudit,
	mockCanMarkAsShipped,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendShippingEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockCreateOrderAudit: vi.fn(),
	mockCanMarkAsShipped: vi.fn().mockReturnValue({ canShip: true }),
	mockGetOrderInvalidationTags: vi.fn().mockReturnValue([]),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
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
	sendShippingConfirmationEmail: mockSendShippingEmail,
	sendOrderConfirmationEmail: vi.fn(),
}));
vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
	createOrderAudit: mockCreateOrderAudit,
}));
vi.mock("../../services/order-status-validation.service", () => ({
	canMarkAsShipped: mockCanMarkAsShipped,
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn((path: string) => `https://synclune.fr${path}`),
	ROUTES: {
		// `SHOP.ORDER_TRACKING` : le lien client des emails passe par
		// `buildOrderTrackingUrl` depuis le retrait de l'espace client (2026-07-31).
		SHOP: { ORDER_TRACKING: "/suivi-commande" },
		ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` },
	},
}));
vi.mock("../../utils/customer-name", () => ({
	extractCustomerFirstName: vi.fn().mockReturnValue("Client"),
}));
vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	getTrackingUrl: vi.fn().mockReturnValue("https://carrier/track"),
	getCarrierLabel: vi.fn().mockReturnValue("La Poste"),
}));

import { markAsShipped } from "../mark-as-shipped";

describe("ORD-BIZ-012 — audit reflète l'intention puis le résultat email", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin Test" },
		});
		mockEnforceRateLimit.mockResolvedValue({ rateLimited: false });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
			fn(mockPrisma),
		);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
	});

	describe("markAsShipped", () => {
		const makeForm = () =>
			createMockFormData({
				id: VALID_CUID,
				trackingNumber: "8N12345678901",
				carrier: "colissimo",
				sendEmail: "true",
			});

		it("trace metadata.emailRequested (intention) — pas emailSent (fait)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					id: VALID_CUID,
					status: "PROCESSING",
					paymentStatus: "PAID",
					customerEmail: "client@example.com",
				}),
			);
			mockSendShippingEmail.mockResolvedValue({ success: true, data: { id: "email_1" } });

			await markAsShipped(undefined, makeForm());

			expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
				mockPrisma,
				expect.objectContaining({
					action: "SHIPPED",
					metadata: expect.objectContaining({ emailRequested: true }),
				}),
			);
			// Pas de clé "emailSent" dans l'audit initial (renommé en emailRequested)
			const initialAudit = mockCreateOrderAuditTx.mock.calls[0]?.[1];
			expect(initialAudit?.metadata.emailSent).toBeUndefined();
		});

		/**
		 * ⚠️ Le mode d'échec est `{ success: false }`, PAS un throw.
		 * `sendShippingConfirmationEmail` n'échoue jamais par exception : circuit
		 * breaker ouvert, `RESEND_API_KEY` absente, échec de rendu et 4xx Resend
		 * sont tous interceptés par `send-email.ts` et rapportés dans le résultat.
		 * Ce test simulait un `mockRejectedValue` — une condition impossible en
		 * production — ce qui le rendait vert alors que `emailSent = true` était
		 * posé inconditionnellement et que la garantie ORD-BIZ-012 était vide.
		 * Ne pas revenir à un rejet de promesse : ce serait re-perdre la couverture.
		 */
		it("crée une 2e OrderHistory post-commit si l'email est rejeté", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					id: VALID_CUID,
					status: "PROCESSING",
					paymentStatus: "PAID",
					customerEmail: "client@example.com",
				}),
			);
			mockSendShippingEmail.mockResolvedValue({ success: false, error: "Resend down" });

			const result = await markAsShipped(undefined, makeForm());

			expect(result.status).toBe(ActionStatus.WARNING);
			expect(mockCreateOrderAudit).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "SHIPPED",
					metadata: expect.objectContaining({
						emailDeliveryFailed: true,
						postCommit: true,
					}),
				}),
			);
		});

		// Filet séparé : un throw inattendu doit rester tracé de la même façon.
		it("crée une 2e OrderHistory post-commit si l'email throw", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					id: VALID_CUID,
					status: "PROCESSING",
					paymentStatus: "PAID",
					customerEmail: "client@example.com",
				}),
			);
			mockSendShippingEmail.mockRejectedValue(new Error("render crash"));

			const result = await markAsShipped(undefined, makeForm());

			expect(result.status).toBe(ActionStatus.WARNING);
			expect(mockCreateOrderAudit).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({ emailDeliveryFailed: true }),
				}),
			);
		});

		it("ne crée PAS d'audit post-commit si l'email passe", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					id: VALID_CUID,
					status: "PROCESSING",
					paymentStatus: "PAID",
					customerEmail: "client@example.com",
				}),
			);
			mockSendShippingEmail.mockResolvedValue({ success: true, data: { id: "email_1" } });

			await markAsShipped(undefined, makeForm());

			expect(mockCreateOrderAudit).not.toHaveBeenCalled();
		});
	});
});
