/**
 * @regression ORD-BIZ-012
 *
 * Garantit que `markAsShipped` et `markAsDelivered` distinguent dans l'audit
 * trail l'intention d'envoyer un email (`emailRequested`) du résultat réel.
 * Si l'envoi Resend échoue après commit, une 2e entrée OrderHistory est créée
 * avec `metadata.emailDeliveryFailed: true`.
 *
 * Sans cette régression : `metadata.emailSent: true` est posé dans l'audit
 * initial avant l'envoi réel → audit faussement positif si l'envoi échoue.
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
	mockSendDeliveryEmail,
	mockCreateOrderAuditTx,
	mockCreateOrderAudit,
	mockCanMarkAsShipped,
	mockCanMarkAsDelivered,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendShippingEmail: vi.fn(),
	mockSendDeliveryEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockCreateOrderAudit: vi.fn(),
	mockCanMarkAsShipped: vi.fn().mockReturnValue({ canShip: true }),
	mockCanMarkAsDelivered: vi.fn().mockReturnValue({ canDeliver: true }),
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
	sendDeliveryConfirmationEmail: mockSendDeliveryEmail,
	sendOrderConfirmationEmail: vi.fn(),
}));
vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
	createOrderAudit: mockCreateOrderAudit,
}));
vi.mock("../../services/order-status-validation.service", () => ({
	canMarkAsShipped: mockCanMarkAsShipped,
	canMarkAsDelivered: mockCanMarkAsDelivered,
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("@/modules/reviews/constants/cache", () => ({
	REVIEWS_CACHE_TAGS: { REVIEWABLE: (id: string) => `reviewable-${id}` },
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn((path: string) => `https://synclune.fr${path}`),
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));
vi.mock("../../utils/customer-name", () => ({
	extractCustomerFirstName: vi.fn().mockReturnValue("Client"),
}));
vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	getTrackingUrl: vi.fn().mockReturnValue("https://carrier/track"),
	getCarrierLabel: vi.fn().mockReturnValue("La Poste"),
}));

import { markAsShipped } from "../mark-as-shipped";
import { markAsDelivered } from "../mark-as-delivered";

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
		mockPrisma.order.update.mockResolvedValue({});
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
					fulfillmentStatus: "PROCESSING",
					customerEmail: "client@example.com",
				}),
			);
			mockSendShippingEmail.mockResolvedValue(undefined);

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

		it("crée une 2e OrderHistory post-commit si l'email échoue", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					id: VALID_CUID,
					status: "PROCESSING",
					paymentStatus: "PAID",
					fulfillmentStatus: "PROCESSING",
					customerEmail: "client@example.com",
				}),
			);
			mockSendShippingEmail.mockRejectedValue(new Error("Resend down"));

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

		it("ne crée PAS d'audit post-commit si l'email passe", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					id: VALID_CUID,
					status: "PROCESSING",
					paymentStatus: "PAID",
					fulfillmentStatus: "PROCESSING",
					customerEmail: "client@example.com",
				}),
			);
			mockSendShippingEmail.mockResolvedValue(undefined);

			await markAsShipped(undefined, makeForm());

			expect(mockCreateOrderAudit).not.toHaveBeenCalled();
		});
	});

	describe("markAsDelivered", () => {
		const makeForm = () => createMockFormData({ id: VALID_CUID, sendEmail: "true" });

		it("trace metadata.emailRequested (intention) — pas emailSent (fait)", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					id: VALID_CUID,
					status: "SHIPPED",
					fulfillmentStatus: "SHIPPED",
					customerEmail: "client@example.com",
				}),
			);
			mockSendDeliveryEmail.mockResolvedValue(undefined);

			await markAsDelivered(undefined, makeForm());

			expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
				mockPrisma,
				expect.objectContaining({
					action: "DELIVERED",
					metadata: expect.objectContaining({ emailRequested: true }),
				}),
			);
			const initialAudit = mockCreateOrderAuditTx.mock.calls[0]?.[1];
			expect(initialAudit?.metadata.emailSent).toBeUndefined();
		});

		it("crée une 2e OrderHistory post-commit si l'email échoue", async () => {
			mockPrisma.order.findUnique.mockResolvedValue(
				createMockOrder({
					id: VALID_CUID,
					status: "SHIPPED",
					fulfillmentStatus: "SHIPPED",
					customerEmail: "client@example.com",
				}),
			);
			mockSendDeliveryEmail.mockRejectedValue(new Error("Resend down"));

			await markAsDelivered(undefined, makeForm());

			expect(mockCreateOrderAudit).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "DELIVERED",
					metadata: expect.objectContaining({
						emailDeliveryFailed: true,
						postCommit: true,
					}),
				}),
			);
		});
	});
});
