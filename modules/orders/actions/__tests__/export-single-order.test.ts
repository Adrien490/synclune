import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockGenerateOrdersCsv,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGenerateOrdersCsv: vi.fn(),
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
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "Commande introuvable.",
		EXPORT_ORDER_FAILED: "Erreur lors de l'export de la commande.",
	},
}));
vi.mock("../../schemas/order.schemas", () => ({
	exportSingleOrderSchema: {},
}));
vi.mock("../../services/export-orders-csv.service", () => ({
	generateOrdersCsv: mockGenerateOrdersCsv,
}));

import { exportSingleOrder } from "../export-single-order";

// ============================================================================
// TESTS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });

describe("exportSingleOrder", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@x.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID } });
		mockGenerateOrdersCsv.mockReturnValue("col1;col2\nval1;val2");

		mockPrisma.order.findUnique.mockResolvedValue({
			orderNumber: "SYN-2026-0042",
			invoiceNumber: "F-2026-00042",
			createdAt: new Date("2026-04-10"),
			paidAt: new Date("2026-04-10"),
			customerName: "Marie Dupont",
			customerEmail: "marie@example.com",
			subtotal: 5000,
			discountAmount: 0,
			shippingCost: 500,
			total: 5500,
			paymentMethod: "CARD",
			paymentStatus: "PAID",
			status: "DELIVERED",
		});

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await exportSingleOrder(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await exportSingleOrder(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error for invalid input", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" },
		});
		const result = await exportSingleOrder(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await exportSingleOrder(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("returns CSV with correct filename on success", async () => {
		const result = await exportSingleOrder(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.csv).toBe("col1;col2\nval1;val2");
		expect(result.filename).toBe("commande-SYN-2026-0042.csv");
	});

	it("calls generateOrdersCsv with order array", async () => {
		await exportSingleOrder(undefined, validFormData);
		expect(mockGenerateOrdersCsv).toHaveBeenCalledWith([
			expect.objectContaining({
				orderNumber: "SYN-2026-0042",
				invoiceNumber: "F-2026-00042",
				total: 5500,
			}),
		]);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.order.findUnique.mockRejectedValue(new Error("DB crash"));
		const result = await exportSingleOrder(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
