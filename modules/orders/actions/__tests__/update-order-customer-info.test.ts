import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockUpdateTag,
	mockSanitizeText,
	mockCreateOrderAuditTx,
	mockGetOrderMetadataInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderMetadataInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "single" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("../../constants/cache", () => ({
	getOrderMetadataInvalidationTags: mockGetOrderMetadataInvalidationTags,
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "Commande introuvable.",
		UPDATE_CUSTOMER_INFO_FAILED: "Erreur lors de la modification des informations client.",
		CANNOT_UPDATE_BILLING_INVOICED: "Facture déjà générée.",
	},
}));
vi.mock("@/app/generated/prisma/client", () => ({
	InvoiceStatus: { PENDING: "PENDING", GENERATED: "GENERATED", VOIDED: "VOIDED" },
}));
vi.mock("../../schemas/order.schemas", () => ({
	updateOrderCustomerInfoSchema: {},
}));

import { updateOrderCustomerInfo } from "../update-order-customer-info";

// ============================================================================
// TESTS
// ============================================================================

const validFormData = createMockFormData({
	id: VALID_CUID,
	customerEmail: "new@example.com",
	customerName: "Marie Nouveau",
	customerPhone: "0612345678",
});

describe("updateOrderCustomerInfo", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@x.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockValidateInput.mockReturnValue({
			data: {
				id: VALID_CUID,
				customerEmail: "new@example.com",
				customerName: "Marie Nouveau",
				customerPhone: "0612345678",
			},
		});
		mockGetOrderMetadataInvalidationTags.mockReturnValue(["orders-list"]);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(
			createMockOrder({ invoiceStatus: null, customerPhone: "0600000000" }),
		);
		mockPrisma.order.update.mockResolvedValue({});

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await updateOrderCustomerInfo(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await updateOrderCustomerInfo(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error for invalid input", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Email invalide" },
		});
		const result = await updateOrderCustomerInfo(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await updateOrderCustomerInfo(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("returns error when invoice already GENERATED", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createMockOrder({ invoiceStatus: "GENERATED" }),
				);
				return fn(mockPrisma);
			},
		);
		const result = await updateOrderCustomerInfo(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Facture");
	});

	it("updates customer info and returns success", async () => {
		const result = await updateOrderCustomerInfo(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					customerEmail: "new@example.com",
					customerName: "Marie Nouveau",
					customerPhone: "0612345678",
				},
			}),
		);
	});

	it("normalizes email to lowercase", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				id: VALID_CUID,
				customerEmail: "UPPER@EXAMPLE.COM",
				customerName: "Marie",
				customerPhone: undefined,
			},
		});
		await updateOrderCustomerInfo(undefined, validFormData);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					customerEmail: "upper@example.com",
				}),
			}),
		);
	});

	it("sets phone to null when not provided", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				id: VALID_CUID,
				customerEmail: "new@example.com",
				customerName: "Marie",
				customerPhone: undefined,
			},
		});
		await updateOrderCustomerInfo(undefined, validFormData);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ customerPhone: null }),
			}),
		);
	});

	it("creates audit trail with previous and new values", async () => {
		await updateOrderCustomerInfo(undefined, validFormData);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				action: "ADDRESS_UPDATED",
				note: "Informations client modifiées",
				metadata: expect.objectContaining({
					updateType: "customerInfo",
					previous: expect.objectContaining({
						email: "client@example.com",
						phone: "0600000000",
					}),
					new: expect.objectContaining({
						email: "new@example.com",
						phone: "0612345678",
					}),
				}),
			}),
		);
	});

	it("invalidates metadata caches", async () => {
		await updateOrderCustomerInfo(undefined, validFormData);
		expect(mockGetOrderMetadataInvalidationTags).toHaveBeenCalledWith(
			VALID_USER_ID,
			expect.any(String),
		);
	});

	it("uses transaction for atomic operation", async () => {
		await updateOrderCustomerInfo(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await updateOrderCustomerInfo(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
