import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_ORDER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockUpdateTag,
	mockSanitizeText,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
		orderNote: { create: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSanitizeText: vi.fn(),
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
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
}));
vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));
vi.mock("../../schemas/order.schemas", () => ({
	addOrderNoteSchema: {},
}));
vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: { NOTES: (id: string) => `order-notes-${id}` },
}));

import { addOrderNote } from "../add-order-note";

// ============================================================================
// TESTS
// ============================================================================

describe("addOrderNote", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { orderId: VALID_ORDER_ID, content: "Note test" },
		});
		mockPrisma.order.findUnique.mockResolvedValue({ id: VALID_ORDER_ID });
		mockPrisma.orderNote.create.mockResolvedValue({});
		mockSanitizeText.mockImplementation((text: string) => text);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await addOrderNote(VALID_ORDER_ID, "Note");
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await addOrderNote(VALID_ORDER_ID, "Note");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Contenu requis" },
		});
		const result = await addOrderNote(VALID_ORDER_ID, "");
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns error when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await addOrderNote(VALID_ORDER_ID, "Note");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Commande non trouvée");
	});

	it("creates note with sanitized content and admin info", async () => {
		mockSanitizeText.mockReturnValue("Sanitized note");

		await addOrderNote(VALID_ORDER_ID, "  Note test  ");

		expect(mockSanitizeText).toHaveBeenCalled();
		expect(mockPrisma.orderNote.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					orderId: VALID_ORDER_ID,
					content: "Sanitized note",
					authorId: "admin-1",
					authorName: "Admin",
				}),
			}),
		);
	});

	it("invalidates order notes cache", async () => {
		await addOrderNote(VALID_ORDER_ID, "Note");
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-notes-${VALID_ORDER_ID}`);
	});

	it("returns success on creation", async () => {
		const result = await addOrderNote(VALID_ORDER_ID, "Note");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.orderNote.create.mockRejectedValue(new Error("DB crash"));
		const result = await addOrderNote(VALID_ORDER_ID, "Note");
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
