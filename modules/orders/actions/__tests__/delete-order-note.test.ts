import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_CUID, VALID_ORDER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockHandleActionError,
	mockUpdateTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		orderNote: { findUnique: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
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
}));
vi.mock("../../schemas/order.schemas", () => ({
	deleteOrderNoteSchema: {},
}));
vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: { NOTES: (id: string) => `order-notes-${id}` },
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOTE_NOT_FOUND: "Note introuvable.",
		NOT_NOTE_AUTHOR: "Vous ne pouvez modifier que vos propres notes.",
	},
}));

import { deleteOrderNote } from "../delete-order-note";

// ============================================================================
// TESTS
// ============================================================================

const NOTE_ID = VALID_CUID;
const ADMIN_ID = "admin-1";

describe("deleteOrderNote", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: ADMIN_ID, name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { noteId: NOTE_ID } });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.orderNote.findUnique.mockResolvedValue({
			id: NOTE_ID,
			orderId: VALID_ORDER_ID,
			authorId: ADMIN_ID,
		});
		mockPrisma.orderNote.update.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
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
		const result = await deleteOrderNote(NOTE_ID);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await deleteOrderNote(NOTE_ID);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" },
		});
		const result = await deleteOrderNote("");
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns NOT_FOUND when note does not exist", async () => {
		mockPrisma.orderNote.findUnique.mockResolvedValue(null);
		const result = await deleteOrderNote(NOTE_ID);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("filters soft-deleted notes via notDeleted in findUnique (ORD-SEC-005)", async () => {
		await deleteOrderNote(NOTE_ID);
		expect(mockPrisma.orderNote.findUnique).toHaveBeenCalledWith({
			where: { id: NOTE_ID, deletedAt: null },
			select: { id: true, orderId: true, authorId: true },
		});
	});

	it("returns FORBIDDEN when admin is not the author (ORD-SEC-002)", async () => {
		mockPrisma.orderNote.findUnique.mockResolvedValue({
			id: NOTE_ID,
			orderId: VALID_ORDER_ID,
			authorId: "other-admin",
		});
		const result = await deleteOrderNote(NOTE_ID);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.orderNote.update).not.toHaveBeenCalled();
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("soft-deletes the note (legal compliance)", async () => {
		await deleteOrderNote(NOTE_ID);
		expect(mockPrisma.orderNote.update).toHaveBeenCalledWith({
			where: { id: NOTE_ID },
			data: { deletedAt: expect.any(Date) },
		});
	});

	it("invalidates order notes cache", async () => {
		await deleteOrderNote(NOTE_ID);
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-notes-${VALID_ORDER_ID}`);
	});

	it("does not invalidate cache when orderId is null", async () => {
		mockPrisma.orderNote.findUnique.mockResolvedValue({
			id: NOTE_ID,
			orderId: null,
			authorId: ADMIN_ID,
		});
		await deleteOrderNote(NOTE_ID);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("returns success on delete", async () => {
		const result = await deleteOrderNote(NOTE_ID);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Note supprimée");
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await deleteOrderNote(NOTE_ID);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
