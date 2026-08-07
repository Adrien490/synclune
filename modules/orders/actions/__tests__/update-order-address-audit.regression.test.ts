/**
 * @regression ORD-BIZ-005
 *
 * Garantit que `updateOrderShippingAddress`
 * créent une entrée `OrderHistory.ADDRESS_UPDATED` immuable traçant qui/quand/
 * quels champs (Art. L123-22).
 *
 * Sans cette régression : un admin pourrait modifier silencieusement une
 * adresse (factice, snapshot figé). Les notes OrderNote sont mutables et
 * ne suffisent pas pour l'audit comptable.
 *
 * ⚠️ Contrat durci (audit rétention PII 10 ans 2026-07-09) : le metadata ne
 * contient QUE `addressType` + `changedFields` (+ flags sameAsShipping,
 * booléens non-PII) — JAMAIS les valeurs d'adresse (previousAddress/newAddress
 * historiques). OrderHistory est immuable 10 ans et n'est scrubé ni à
 * l'anonymisation ni à la purge : toute valeur de PII client qui y entre
 * survivrait sans limite de durée (RGPD Art. 5.1.e). Les valeurs probantes
 * vivent sur le snapshot Order et la facture figée.
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
		CANNOT_UPDATE_ADDRESS_CREDIT_NOTE: "Avoir déjà émis.",
		CANNOT_UPDATE_ADDRESS_INVOICE_ARCHIVING: "Facture en cours d'archivage.",
		UPDATE_SHIPPING_ADDRESS_FAILED: "Erreur shipping.",
	},
}));
vi.mock("../../constants/cache", () => ({
	getOrderMetadataInvalidationTags: mockGetOrderMetadataInvalidationTags,
}));
vi.mock("../../schemas/order.schemas", () => ({
	updateOrderShippingAddressSchema: {},
}));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));

import { updateOrderShippingAddress } from "../update-order-shipping-address";

// `update-order-billing-address` a été supprimé avec les 9 colonnes `billing*`
// (2026-08-04) : il ne reste qu'UNE action d'adresse.
describe("ORD-BIZ-005 — update-order-shipping-address crée OrderHistory.ADDRESS_UPDATED", () => {
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
		it("crée OrderHistory.ADDRESS_UPDATED avec changedFields + addressType=shipping, SANS valeur d'adresse", async () => {
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
					shippingPhone: "+33612345678",
				},
			});
			mockPrisma.order.findUnique.mockResolvedValue({
				id: VALID_CUID,
				orderNumber: "SYN-2026-0001",
				status: "PROCESSING",
				// Aucune pièce comptable encore émise : les deux gardes comptables
				// d'`update-order-shipping-address` laissent passer.
				invoiceNumber: null,
				invoicePdfUrl: null,
				creditNoteNumber: null,
				shippingFirstName: "Marie",
				shippingLastName: "OldName",
				shippingAddress1: "1 Rue Ancienne",
				shippingAddress2: null,
				shippingPostalCode: "75002",
				shippingCity: "Paris",
				shippingCountry: "FR",
				shippingPhone: "+33600000000",
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
					authorName: "Lucie",
					metadata: expect.objectContaining({
						addressType: "shipping",
						changedFields: expect.arrayContaining([
							"shippingLastName",
							"shippingAddress1",
							"shippingCity",
						]),
						// Booléen, jamais une valeur : trace l'écart éventuel entre la
						// facture scellée et la colonne vivante (audit 2026-08-07).
						invoiceAlreadyIssued: false,
					}),
				}),
			);

			// RGPD : aucune VALEUR d'adresse dans le metadata immuable — ni les clés
			// historiques previousAddress/newAddress, ni une valeur saisie/lue en DB.
			const metadata = mockCreateOrderAuditTx.mock.calls[0]![1].metadata;
			expect(metadata).not.toHaveProperty("previousAddress");
			expect(metadata).not.toHaveProperty("newAddress");
			const serialized = JSON.stringify(metadata);
			expect(serialized).not.toContain("Rue Neuve");
			expect(serialized).not.toContain("Rue Ancienne");
			expect(serialized).not.toContain("OldName");
			expect(serialized).not.toContain("Dupont");
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
				status: "SHIPPED",
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
});
