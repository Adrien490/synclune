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
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		refund: { count: vi.fn().mockResolvedValue(0) },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
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
vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "Commande introuvable.",
		ALREADY_FULLY_REFUNDED: "Cette commande est déjà entièrement remboursée.",
		CANNOT_REFUND_NOT_PAID: "Seules les commandes payées peuvent être remboursées.",
		MARK_AS_FULLY_REFUNDED_FAILED: "Erreur lors du marquage de la commande comme remboursée.",
	},
}));
vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		EXPIRED: "EXPIRED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		REFUNDED: "REFUNDED",
	},
	HistorySource: { ADMIN: "ADMIN", CUSTOMER: "CUSTOMER", SYSTEM: "SYSTEM" },
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
	InvoiceStatus: {
		PENDING: "PENDING",
		GENERATED: "GENERATED",
		VOIDED: "VOIDED",
	},
}));

vi.mock("../../services/void-invoice.service", () => ({
	voidInvoice: vi.fn(),
}));

vi.mock("../../schemas/order.schemas", () => ({
	markAsFullyRefundedSchema: {},
}));

import { markAsFullyRefunded } from "../mark-as-fully-refunded";

// ============================================================================
// TESTS
// ============================================================================

const validFormData = createMockFormData({
	id: VALID_CUID,
	reason: "Geste commercial",
});

describe("markAsFullyRefunded", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@x.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, reason: "Geste commercial" },
		});
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createMockOrder({ paymentStatus: "PAID" }));
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
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error for invalid input", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" },
		});
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("returns error when order is already REFUNDED", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createMockOrder({ paymentStatus: "REFUNDED" }),
				);
				return fn(mockPrisma);
			},
		);
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("déjà");
	});

	it("returns error when order is PENDING (not paid)", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createMockOrder({ paymentStatus: "PENDING" }),
				);
				return fn(mockPrisma);
			},
		);
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("payées");
	});

	it("succeeds when order is PAID", async () => {
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { paymentStatus: "REFUNDED" },
			}),
		);
	});

	it("succeeds when order is PARTIALLY_REFUNDED", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findUnique.mockResolvedValue(
					createMockOrder({ paymentStatus: "PARTIALLY_REFUNDED" }),
				);
				return fn(mockPrisma);
			},
		);
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("creates audit trail with REFUND_COMPLETED", async () => {
		await markAsFullyRefunded(undefined, validFormData);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				action: "REFUND_COMPLETED",
				previousPaymentStatus: "PAID",
				newPaymentStatus: "REFUNDED",
				note: "Geste commercial",
				metadata: expect.objectContaining({ manual: true }),
			}),
		);
	});

	it("invalidates order caches", async () => {
		await markAsFullyRefunded(undefined, validFormData);
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith(VALID_USER_ID, expect.any(String));
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("uses transaction for atomic operation", async () => {
		await markAsFullyRefunded(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await markAsFullyRefunded(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("uses default note when reason is not provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, reason: undefined },
		});
		const fdNoReason = createMockFormData({ id: VALID_CUID });
		await markAsFullyRefunded(undefined, fdNoReason);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				note: "Marquée comme remboursée (manuel)",
			}),
		);
	});
});
