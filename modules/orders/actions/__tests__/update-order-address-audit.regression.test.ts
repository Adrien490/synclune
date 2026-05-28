/**
 * @regression ORD-BIZ-005
 *
 * Garantit que `updateOrderShippingAddress` et `updateOrderBillingAddress`
 * créent une entrée `OrderHistory.ADDRESS_UPDATED` immuable avec les
 * snapshots avant/après (Art. L123-22).
 *
 * Sans cette régression : un admin pourrait modifier silencieusement une
 * adresse (factice, snapshot figé). Les notes OrderNote sont mutables et
 * ne suffisent pas pour l'audit comptable.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockGetOrderMetadataInvalidationTags,
	mockCreateOrderAuditTx,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockGetOrderMetadataInvalidationTags: vi.fn().mockReturnValue([]),
	mockCreateOrderAuditTx: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: vi.fn((e: Error, fallback: string) => ({
		status: "error",
		message: e.message || fallback,
	})),
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: (t: string) => t }));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "Commande introuvable.",
		CANNOT_UPDATE_ADDRESS_SHIPPED: "Commande déjà expédiée.",
		CANNOT_UPDATE_BILLING_INVOICED: "Facture déjà émise.",
		UPDATE_SHIPPING_ADDRESS_FAILED: "Erreur shipping.",
		UPDATE_BILLING_ADDRESS_FAILED: "Erreur billing.",
	},
}));
vi.mock("../../constants/cache", () => ({
	getOrderMetadataInvalidationTags: mockGetOrderMetadataInvalidationTags,
}));
vi.mock("../../schemas/order.schemas", () => ({
	updateOrderShippingAddressSchema: {},
	updateOrderBillingAddressSchema: {},
}));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));

import { updateOrderShippingAddress } from "../update-order-shipping-address";
import { updateOrderBillingAddress } from "../update-order-billing-address";

describe("ORD-BIZ-005 — update-order-*-address crée OrderHistory.ADDRESS_UPDATED", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-7", name: "Lucie" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.update.mockResolvedValue({});
	});

	describe("updateOrderShippingAddress", () => {
		it("crée OrderHistory.ADDRESS_UPDATED avec previousAddress + newAddress + addressType=shipping", async () => {
			mockValidateInput.mockReturnValue({
				data: {
					id: VALID_CUID,
					shippingFirstName: "Marie",
					shippingLastName: "Dupont",
					shippingAddress1: "12 Rue Neuve",
					shippingAddress2: undefined,
					shippingPostalCode: "75001",
					shippingCity: "Paris",
					shippingCountry: "FR",
				},
			});
			mockPrisma.order.findUnique.mockResolvedValue({
				id: VALID_CUID,
				orderNumber: "SYN-2026-0001",
				userId: "user-1",
				fulfillmentStatus: "PROCESSING",
				shippingFirstName: "Marie",
				shippingLastName: "OldName",
				shippingAddress1: "1 Rue Ancienne",
				shippingAddress2: null,
				shippingPostalCode: "75002",
				shippingCity: "Paris",
				shippingCountry: "FR",
			});

			const result = await updateOrderShippingAddress(
				undefined,
				createMockFormData({
					id: VALID_CUID,
					shippingFirstName: "Marie",
					shippingLastName: "Dupont",
					shippingAddress1: "12 Rue Neuve",
					shippingPostalCode: "75001",
					shippingCity: "Paris",
					shippingCountry: "FR",
				}),
			);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(1);
			expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
				mockPrisma,
				expect.objectContaining({
					orderId: VALID_CUID,
					action: "ADDRESS_UPDATED",
					authorId: "admin-7",
					authorName: "Lucie",
					metadata: expect.objectContaining({
						addressType: "shipping",
						previousAddress: expect.objectContaining({
							lastName: "OldName",
							address1: "1 Rue Ancienne",
						}),
						newAddress: expect.objectContaining({
							shippingLastName: "Dupont",
							shippingAddress1: "12 Rue Neuve",
						}),
					}),
				}),
			);
		});

		it("ne crée PAS d'audit si commande déjà expédiée (refus)", async () => {
			mockValidateInput.mockReturnValue({
				data: {
					id: VALID_CUID,
					shippingFirstName: "Marie",
					shippingLastName: "Dupont",
					shippingAddress1: "12 Rue Neuve",
					shippingPostalCode: "75001",
					shippingCity: "Paris",
					shippingCountry: "FR",
				},
			});
			mockPrisma.order.findUnique.mockResolvedValue({
				id: VALID_CUID,
				orderNumber: "SYN-2026-0001",
				userId: "user-1",
				fulfillmentStatus: "SHIPPED",
				shippingFirstName: "",
				shippingLastName: "",
				shippingAddress1: "",
				shippingAddress2: null,
				shippingPostalCode: "",
				shippingCity: "",
				shippingCountry: "FR",
			});

			const result = await updateOrderShippingAddress(
				undefined,
				createMockFormData({ id: VALID_CUID }),
			);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
		});
	});

	describe("updateOrderBillingAddress", () => {
		it("crée OrderHistory.ADDRESS_UPDATED avec addressType=billing + previousAddress + newAddress", async () => {
			mockValidateInput.mockReturnValue({
				data: {
					id: VALID_CUID,
					billingSameAsShipping: false,
					billingFirstName: "Jean",
					billingLastName: "Martin",
					billingAddress1: "5 Bd Saint-Michel",
					billingPostalCode: "75005",
					billingCity: "Paris",
					billingCountry: "FR",
					billingPhone: "0612345678",
				},
			});
			mockPrisma.order.findUnique.mockResolvedValue({
				id: VALID_CUID,
				orderNumber: "SYN-2026-0001",
				userId: "user-1",
				invoiceStatus: "DRAFT",
				billingSameAsShipping: true,
				billingFirstName: null,
				billingLastName: null,
				billingAddress1: null,
				billingAddress2: null,
				billingPostalCode: null,
				billingCity: null,
				billingCountry: null,
				billingPhone: null,
			});

			const result = await updateOrderBillingAddress(
				undefined,
				createMockFormData({
					id: VALID_CUID,
					billingSameAsShipping: "false",
					billingFirstName: "Jean",
					billingLastName: "Martin",
					billingAddress1: "5 Bd Saint-Michel",
					billingPostalCode: "75005",
					billingCity: "Paris",
					billingCountry: "FR",
					billingPhone: "0612345678",
				}),
			);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(1);
			expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
				mockPrisma,
				expect.objectContaining({
					orderId: VALID_CUID,
					action: "ADDRESS_UPDATED",
					metadata: expect.objectContaining({
						addressType: "billing",
						previousAddress: expect.objectContaining({ sameAsShipping: true }),
						newAddress: expect.objectContaining({ billingLastName: "Martin" }),
					}),
				}),
			);
		});

		it("refuse si la facture est déjà GENERATED (immutabilité comptable)", async () => {
			mockValidateInput.mockReturnValue({
				data: {
					id: VALID_CUID,
					billingSameAsShipping: false,
					billingFirstName: "Jean",
					billingLastName: "Martin",
					billingAddress1: "5 Bd Saint-Michel",
					billingPostalCode: "75005",
					billingCity: "Paris",
					billingCountry: "FR",
					billingPhone: "0612345678",
				},
			});
			mockPrisma.order.findUnique.mockResolvedValue({
				id: VALID_CUID,
				orderNumber: "SYN-2026-0001",
				userId: "user-1",
				invoiceStatus: "GENERATED",
				billingSameAsShipping: true,
				billingFirstName: null,
				billingLastName: null,
				billingAddress1: null,
				billingAddress2: null,
				billingPostalCode: null,
				billingCity: null,
				billingCountry: null,
				billingPhone: null,
			});

			const result = await updateOrderBillingAddress(
				undefined,
				createMockFormData({ id: VALID_CUID, billingSameAsShipping: "false" }),
			);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
			expect(mockPrisma.order.update).not.toHaveBeenCalled();
		});
	});
});
