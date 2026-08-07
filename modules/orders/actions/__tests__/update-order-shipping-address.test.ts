import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as SharedActions from "@/shared/lib/actions";
import { ActionStatus } from "@/shared/types/server-action";
import {
	createMockFormData,
	createMockOrder,
	VALID_CUID,
	VALID_USER_ID,
	VALID_ORDER_ID,
} from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockHandleActionError,
	mockUpdateTag,
	mockSanitizeText,
	mockCreateOrderAuditTx,
	mockGetOrderMetadataInvalidationTags,
	mockSchemaSafeParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderMetadataInvalidationTags: vi.fn(),
	mockSchemaSafeParse: vi.fn(),
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
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
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

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../constants/cache", () => ({
	getOrderMetadataInvalidationTags: mockGetOrderMetadataInvalidationTags,
}));

vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		CANNOT_UPDATE_ADDRESS_SHIPPED: "Impossible de modifier l'adresse d'une commande deja expediee.",
		CANNOT_UPDATE_ADDRESS_CREDIT_NOTE: "Un avoir a ete emis pour cette commande.",
		CANNOT_UPDATE_ADDRESS_INVOICE_ARCHIVING: "La facture est en cours d'archivage.",
		UPDATE_SHIPPING_ADDRESS_FAILED: "Erreur lors de la modification de l'adresse.",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	OrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
		CANCELLED: "CANCELLED",
	},
}));

vi.mock("../../schemas/order.schemas", () => ({
	updateOrderShippingAddressSchema: {
		safeParse: mockSchemaSafeParse,
	},
}));

import { updateOrderShippingAddress } from "../update-order-shipping-address";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	id: VALID_CUID,
	shippingFirstName: "Jean",
	shippingLastName: "Martin",
	shippingAddress1: "5 Avenue des Champs",
	shippingAddress2: "Apt 3",
	shippingPostalCode: "75008",
	shippingCity: "Paris",
	shippingCountry: "FR",
	shippingPhone: "+33612345678",
});

const validParsedData = {
	id: VALID_CUID,
	shippingFirstName: "Jean",
	shippingLastName: "Martin",
	shippingAddress1: "5 Avenue des Champs",
	shippingAddress2: "Apt 3",
	shippingPostalCode: "75008",
	shippingCity: "Paris",
	shippingCountry: "FR",
	// Manquait jusqu'au 2026-08-07 : la colonne est NOT NULL et l'action applique un
	// repli `""`, mais aucune fixture ne portait le champ — donc ni le mapping ni le
	// repli n'étaient exercés.
	shippingPhone: "+33612345678",
};

function createOrderForAddressUpdate(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PENDING",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateOrderShippingAddress", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockGetOrderMetadataInvalidationTags.mockReturnValue([
			"orders-list",
			`orders-user-${VALID_USER_ID}`,
		]);

		mockSchemaSafeParse.mockReturnValue({
			success: true,
			data: { ...validParsedData },
		});

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createOrderForAddressUpdate());
		mockPrisma.order.update.mockResolvedValue({});

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// Auth
	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Rate limit
	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Validation
	it("should return validation error for invalid data", async () => {
		mockSchemaSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "L'adresse est requise" }] },
		});

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toContain("adresse");
	});

	it("should use fallback message when no issue message", async () => {
		mockSchemaSafeParse.mockReturnValue({
			success: false,
			error: { issues: [] },
		});

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toBe("Données invalides");
	});

	// Order not found
	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(result.message).toContain("commande");
	});

	// Business rules: cannot update after shipment
	it("should return error when order is SHIPPED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createOrderForAddressUpdate({ status: "SHIPPED", _error: "already_shipped" }),
		);
		// The action returns the result of the transaction, which includes _error
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue({
					...createOrderForAddressUpdate({ status: "SHIPPED" }),
				});
				return fn(mockPrisma);
			},
		);

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("expediee");
	});

	it("should return error when order is DELIVERED", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue({
					...createOrderForAddressUpdate({ status: "DELIVERED" }),
				});
				return fn(mockPrisma);
			},
		);

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("expediee");
	});

	it("should return error when order is RETURNED", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue({
					...createOrderForAddressUpdate({ status: "RETURNED" }),
				});
				return fn(mockPrisma);
			},
		);

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("expediee");
	});

	// ==========================================================================
	// GARDES COMPTABLES (audit invariant 5, 2026-08-07)
	//
	// Depuis le drop des colonnes `billing*` (2026-08-04), `shipping*` EST l'adresse
	// imprimée sous « Facturé à ». Deux fenêtres où la réécrire corromprait une pièce
	// scellée — et UNE troisième, la plus fréquente, où elle doit rester permise.
	// ==========================================================================

	it("REFUSE l'édition quand un avoir a déjà été émis", async () => {
		// L'avoir est rendu depuis ces colonnes VIVANTES puis archivé : le rééditer
		// ferait diverger l'avoir de la facture qu'il corrige (Art. 272-I CGI).
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createOrderForAddressUpdate({
						status: "PROCESSING",
						invoiceNumber: "F-2026-00042",
						invoicePdfUrl: "https://uploadthing.example/f.pdf",
						creditNoteNumber: "A-2026-00007",
					}),
				);
				return fn(mockPrisma);
			},
		);

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("avoir");
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});

	it("REFUSE l'édition tant que la facture numérotée n'a pas d'archive", async () => {
		// `reconcile-invoices` va REGÉNÉRER le PDF depuis ces colonnes et le sceller
		// sous SHA-256 pour dix ans (Art. L102 B LPF). Le cron passe une fois par jour
		// (plafond Hobby) : éditer dans cette fenêtre grave la correction dans la pièce
		// comptable. Refus TEMPORAIRE — d'où le libellé « réessaie plus tard ».
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createOrderForAddressUpdate({
						status: "PROCESSING",
						invoiceNumber: "F-2026-00042",
						invoicePdfUrl: null,
					}),
				);
				return fn(mockPrisma);
			},
		);

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("archivage");
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("AUTORISE l'édition sur une facture émise ET archivée (le cas nominal)", async () => {
		// ⚠️ L'assertion qui compte le plus de cette section. Un gate dur
		// `invoiceNumber !== null` serait le mauvais correctif : le numéro est posé dans
		// les SECONDES suivant le paiement, donc corriger une rue avant expédition — le
		// cas d'usage réel, un colis mal adressé — deviendrait impossible. C'est ce qui
		// avait rendu `update-order-billing-address` inutile avant sa suppression.
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createOrderForAddressUpdate({
						status: "PROCESSING",
						invoiceNumber: "F-2026-00042",
						invoicePdfUrl: "https://uploadthing.example/f.pdf",
					}),
				);
				return fn(mockPrisma);
			},
		);

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.order.update).toHaveBeenCalled();
		// La facture archivée conserve l'adresse précédente : l'audit immuable est le
		// seul endroit où cet écart reste lisible dix ans plus tard.
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				metadata: expect.objectContaining({ invoiceAlreadyIssued: true }),
			}),
		);
	});

	// Success path
	it("should update address and return success for UNFULFILLED order", async () => {
		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("SYN-2026-0001");
		// ⚠️ Le bloc `data` n'était PAS inspecté sur le chemin nominal jusqu'au
		// 2026-08-07 : seul le `where` l'était. Une inversion de mapping (ville ↔ code
		// postal) serait passée au vert. Les 8 colonnes, en valeur.
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_CUID },
				data: {
					shippingFirstName: "Jean",
					shippingLastName: "Martin",
					shippingAddress1: "5 Avenue des Champs",
					shippingAddress2: "Apt 3",
					shippingPostalCode: "75008",
					shippingCity: "Paris",
					shippingCountry: "FR",
					shippingPhone: "+33612345678",
				},
			}),
		);
	});

	it("retombe sur la chaîne vide quand le téléphone est vidé (colonne NOT NULL)", async () => {
		mockSchemaSafeParse.mockReturnValue({
			success: true,
			data: { ...validParsedData, shippingPhone: undefined },
		});

		await updateOrderShippingAddress(undefined, validFormData);

		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ shippingPhone: "" }) }),
		);
	});

	it("should succeed for PROCESSING fulfillment status", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createOrderForAddressUpdate({ status: "PROCESSING" }),
				);
				return fn(mockPrisma);
			},
		);

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// Data sanitization
	it("should sanitize all text fields", async () => {
		await updateOrderShippingAddress(undefined, validFormData);

		expect(mockSanitizeText).toHaveBeenCalledWith("Jean");
		expect(mockSanitizeText).toHaveBeenCalledWith("Martin");
		expect(mockSanitizeText).toHaveBeenCalledWith("5 Avenue des Champs");
		expect(mockSanitizeText).toHaveBeenCalledWith("Apt 3");
		expect(mockSanitizeText).toHaveBeenCalledWith("75008");
		expect(mockSanitizeText).toHaveBeenCalledWith("Paris");
	});

	it("should set shippingAddress2 to null when not provided", async () => {
		mockSchemaSafeParse.mockReturnValue({
			success: true,
			data: { ...validParsedData, shippingAddress2: undefined },
		});

		await updateOrderShippingAddress(undefined, validFormData);

		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					shippingAddress2: null,
				}),
			}),
		);
	});

	// Audit trail
	it("should create audit trail with changedFields only (no address values — RGPD)", async () => {
		await updateOrderShippingAddress(undefined, validFormData);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: VALID_CUID,
				action: "ADDRESS_UPDATED",
				authorName: "Admin",
				note: "Adresse de livraison modifiée",
				metadata: expect.objectContaining({
					addressType: "shipping",
					changedFields: expect.arrayContaining(["shippingFirstName", "shippingAddress1"]),
				}),
			}),
		);

		// RGPD (audit rétention 10 ans) : OrderHistory est immuable et jamais scrubé —
		// aucune valeur d'adresse ne doit entrer dans le metadata.
		const metadata = mockCreateOrderAuditTx.mock.calls[0]![1].metadata;
		expect(metadata).not.toHaveProperty("previousAddress");
		expect(metadata).not.toHaveProperty("newAddress");
	});

	// Cache invalidation
	it("should invalidate order metadata cache tags", async () => {
		await updateOrderShippingAddress(undefined, validFormData);

		expect(mockGetOrderMetadataInvalidationTags).toHaveBeenCalledWith(VALID_ORDER_ID);
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith(`orders-user-${VALID_USER_ID}`);
	});

	// Transaction atomicity
	it("should use transaction for atomic operation", async () => {
		await updateOrderShippingAddress(undefined, validFormData);

		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
	});

	// Error handling
	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await updateOrderShippingAddress(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
