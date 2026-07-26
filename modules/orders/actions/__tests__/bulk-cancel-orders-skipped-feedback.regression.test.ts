/**
 * @regression bulk-cancel-skipped-feedback
 *
 * Verrouille la ventilation du feedback admin de `bulkCancelOrders` :
 * lorsqu'une sélection mêle des commandes inéligibles (expédiée, livrée, déjà
 * annulée, déjà payée, introuvable), le message ET `result.skippedBreakdown`
 * doivent détailler CHAQUE catégorie. Le test existant `bulk-cancel-orders.test`
 * ne couvre qu'une catégorie à la fois (alreadyShipped) ; ce test exerce les 5
 * simultanément pour figer le format complet (cf. bulk-cancel-orders.ts:85-272).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder } from "@/test/factories";
import type * as SharedActions from "@/shared/lib/actions";

// CUID2 valides (lowercase alphanumérique, 25 chars, préfixe lettre).
const ID_ELIGIBLE = "cm1111111111aaaaaaaaaaaaa";
const ID_SHIPPED = "cm2222222222aaaaaaaaaaaaa";
const ID_DELIVERED = "cm3333333333aaaaaaaaaaaaa";
const ID_CANCELLED = "cm4444444444aaaaaaaaaaaaa";
const ID_PAID = "cm5555555555aaaaaaaaaaaaa";
const ID_NOTFOUND = "cm6666666666aaaaaaaaaaaaa";

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSendCancelEmail,
	mockSanitizeText,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
	mockExtractCustomerFirstName,
} = vi.hoisted(() => ({
	mockPrisma: {
		// IDEM-CANCEL-001 : claim atomique order.updateMany ({ count }) remplace
		// l'ancien order.update inconditionnel de la boucle.
		order: { findMany: vi.fn(), updateMany: vi.fn() },
		productSku: { update: vi.fn() },
		discountUsage: { findMany: vi.fn(), deleteMany: vi.fn() },
		discount: { update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendCancelEmail: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockExtractCustomerFirstName: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { BULK_OPERATIONS: "admin-order-bulk" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

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

vi.mock("@/modules/emails/services/status-emails", () => ({
	sendCancelOrderConfirmationEmail: mockSendCancelEmail,
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../utils/customer-name", () => ({
	extractCustomerFirstName: mockExtractCustomerFirstName,
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));

import { bulkCancelOrders } from "../bulk-cancel-orders";

describe("bulkCancelOrders — ventilation complète du feedback skipped", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@synclune.fr" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendCancelEmail.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/SYN-2026-0001");
		mockExtractCustomerFirstName.mockReturnValue("Marie");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.productSku.update.mockResolvedValue({});
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);
		mockPrisma.discountUsage.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.discount.update.mockResolvedValue({});
	});

	it("détaille chaque catégorie ignorée dans le message et skippedBreakdown", async () => {
		// 6 ids sélectionnés ; le 1er findMany n'en retourne que 5 (notFound = 1).
		mockPrisma.order.findMany.mockResolvedValueOnce([
			{ id: ID_ELIGIBLE, status: "PENDING", paymentStatus: "PENDING" },
			{ id: ID_SHIPPED, status: "SHIPPED", paymentStatus: "PAID" },
			{ id: ID_DELIVERED, status: "DELIVERED", paymentStatus: "PAID" },
			{ id: ID_CANCELLED, status: "CANCELLED", paymentStatus: "FAILED" },
			{ id: ID_PAID, status: "PROCESSING", paymentStatus: "PAID" },
		]);
		// 2e findMany : uniquement l'éligible enrichie.
		mockPrisma.order.findMany.mockResolvedValueOnce([
			createMockOrder({
				id: ID_ELIGIBLE,
				orderNumber: "SYN-2026-0001",
				status: "PENDING",
				paymentStatus: "PENDING",
				items: [{ id: "oi-1", skuId: "sku-A", quantity: 1, price: 1000 }],
			}),
		]);

		const fd = createMockFormData({
			orderIds: JSON.stringify([
				ID_ELIGIBLE,
				ID_SHIPPED,
				ID_DELIVERED,
				ID_CANCELLED,
				ID_PAID,
				ID_NOTFOUND,
			]),
		});

		const result = await bulkCancelOrders(undefined, fd);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		// 1 seule commande annulée (singulier, pas de "s").
		expect(result.message).toMatch(/^1 commande annulée/);
		expect(result.message).toContain("ignorées :");
		expect(result.message).toContain("1 expédiée(s)");
		expect(result.message).toContain("1 livrée(s)");
		expect(result.message).toContain("1 déjà annulée(s)");
		expect(result.message).toContain("1 déjà payée(s)");
		expect(result.message).toContain("1 introuvable(s)");

		expect(result.data).toEqual(
			expect.objectContaining({
				count: 1,
				skipped: 5,
				skippedBreakdown: {
					alreadyCancelled: 1,
					alreadyShipped: 1,
					alreadyDelivered: 1,
					alreadyPaid: 1,
					notFound: 1,
				},
			}),
		);
		// Une seule commande effectivement mutée — le claim IDEM-CANCEL-001 porte
		// les préconditions PENDING+PENDING dans le where.
		expect(mockPrisma.order.updateMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
			where: { id: ID_ELIGIBLE, status: "PENDING", paymentStatus: "PENDING" },
			data: { status: "CANCELLED" },
		});
	});
});
