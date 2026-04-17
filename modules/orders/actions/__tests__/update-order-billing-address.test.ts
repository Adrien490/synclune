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
		CANNOT_UPDATE_BILLING_INVOICED:
			"L'adresse de facturation ne peut plus etre modifiee car la facture a ete generee.",
		UPDATE_BILLING_ADDRESS_FAILED: "Erreur lors de la modification de l'adresse de facturation.",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	InvoiceStatus: {
		PENDING: "PENDING",
		GENERATED: "GENERATED",
		VOIDED: "VOIDED",
	},
}));

vi.mock("../../schemas/order.schemas", () => ({
	updateOrderBillingAddressSchema: {
		safeParse: mockSchemaSafeParse,
	},
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { updateOrderBillingAddress } from "../update-order-billing-address";

// ============================================================================
// HELPERS
// ============================================================================

const validFormDataDistinct = createMockFormData({
	id: VALID_CUID,
	billingSameAsShipping: "false",
	billingFirstName: "Jean",
	billingLastName: "Martin",
	billingAddress1: "5 Avenue des Champs",
	billingAddress2: "Apt 3",
	billingPostalCode: "75008",
	billingCity: "Paris",
	billingCountry: "FR",
	billingPhone: "0612345678",
});

const validFormDataSame = createMockFormData({
	id: VALID_CUID,
	billingSameAsShipping: "true",
});

const validParsedDistinct = {
	id: VALID_CUID,
	billingSameAsShipping: false,
	billingFirstName: "Jean",
	billingLastName: "Martin",
	billingAddress1: "5 Avenue des Champs",
	billingAddress2: "Apt 3",
	billingPostalCode: "75008",
	billingCity: "Paris",
	billingCountry: "FR",
	billingPhone: "0612345678",
};

const validParsedSame = {
	id: VALID_CUID,
	billingSameAsShipping: true,
};

function createOrderForBillingUpdate(overrides: Record<string, unknown> = {}) {
	return {
		...createMockOrder({
			invoiceStatus: null,
			billingSameAsShipping: true,
			billingFirstName: null,
			billingLastName: null,
			billingAddress1: null,
			billingAddress2: null,
			billingPostalCode: null,
			billingCity: null,
			billingCountry: null,
			billingPhone: null,
		}),
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateOrderBillingAddress", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@x.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockGetOrderMetadataInvalidationTags.mockReturnValue([
			"orders-list",
			`orders-user-${VALID_USER_ID}`,
		]);

		mockSchemaSafeParse.mockReturnValue({
			success: true,
			data: { ...validParsedDistinct },
		});

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createOrderForBillingUpdate());
		mockPrisma.order.update.mockResolvedValue({});

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid data", async () => {
		mockSchemaSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "Code postal requis" }] },
		});

		const result = await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toContain("postal");
	});

	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when invoice already GENERATED", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createOrderForBillingUpdate({ invoiceStatus: "GENERATED" }),
				);
				return fn(mockPrisma);
			},
		);

		const result = await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("facture");
	});

	it("should update distinct billing address and return success", async () => {
		const result = await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("SYN-2026-0001");
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_CUID },
				data: expect.objectContaining({
					billingSameAsShipping: false,
					billingFirstName: "Jean",
					billingCity: "Paris",
					billingCountry: "FR",
				}),
			}),
		);
	});

	it("should null all billing fields when sameAsShipping is true", async () => {
		mockSchemaSafeParse.mockReturnValue({
			success: true,
			data: { ...validParsedSame },
		});

		await updateOrderBillingAddress(undefined, validFormDataSame);

		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					billingSameAsShipping: true,
					billingFirstName: null,
					billingLastName: null,
					billingAddress1: null,
					billingAddress2: null,
					billingPostalCode: null,
					billingCity: null,
					billingCountry: null,
					billingPhone: null,
				},
			}),
		);
	});

	it("should sanitize all distinct billing text fields", async () => {
		await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(mockSanitizeText).toHaveBeenCalledWith("Jean");
		expect(mockSanitizeText).toHaveBeenCalledWith("Martin");
		expect(mockSanitizeText).toHaveBeenCalledWith("5 Avenue des Champs");
		expect(mockSanitizeText).toHaveBeenCalledWith("Apt 3");
		expect(mockSanitizeText).toHaveBeenCalledWith("75008");
		expect(mockSanitizeText).toHaveBeenCalledWith("Paris");
		expect(mockSanitizeText).toHaveBeenCalledWith("0612345678");
	});

	it("should set billingAddress2 to null when not provided", async () => {
		mockSchemaSafeParse.mockReturnValue({
			success: true,
			data: { ...validParsedDistinct, billingAddress2: undefined },
		});

		await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					billingAddress2: null,
				}),
			}),
		);
	});

	it("should create audit trail with addressType=billing", async () => {
		await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: VALID_CUID,
				action: "ADDRESS_UPDATED",
				authorId: "admin-1",
				authorName: "Admin",
				note: "Adresse de facturation modifiee",
				metadata: expect.objectContaining({
					addressType: "billing",
				}),
			}),
		);
	});

	it("should invalidate order metadata cache tags", async () => {
		await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(mockGetOrderMetadataInvalidationTags).toHaveBeenCalledWith(
			VALID_USER_ID,
			VALID_ORDER_ID,
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith(`orders-user-${VALID_USER_ID}`);
	});

	it("should use transaction for atomic operation", async () => {
		await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await updateOrderBillingAddress(undefined, validFormDataDistinct);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
