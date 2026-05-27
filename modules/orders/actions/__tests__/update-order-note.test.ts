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
	mockSanitizeText,
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
	mockSanitizeText: vi.fn(),
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
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));
vi.mock("../../schemas/order.schemas", () => ({
	updateOrderNoteSchema: {},
}));
vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: { NOTES: (id: string) => `order-notes-${id}` },
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOTE_NOT_FOUND: "Note introuvable.",
		NOT_NOTE_AUTHOR: "Vous ne pouvez modifier que vos propres notes.",
		UPDATE_NOTE_FAILED: "Erreur lors de la modification de la note.",
	},
}));

import { updateOrderNote } from "../update-order-note";

// ============================================================================
// TESTS
// ============================================================================

const NOTE_ID = VALID_CUID;
const ADMIN_ID = "admin-1";
const NEW_CONTENT = "Note corrigée";

describe("updateOrderNote", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: ADMIN_ID, name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { noteId: NOTE_ID, content: NEW_CONTENT },
		});
		mockSanitizeText.mockImplementation((t: string) => t);
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
		const result = await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" },
		});
		const result = await updateOrderNote("", NEW_CONTENT);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns NOT_FOUND when note does not exist", async () => {
		mockPrisma.orderNote.findUnique.mockResolvedValue(null);
		const result = await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("filters soft-deleted notes via notDeleted in findUnique (ORD-SEC-005)", async () => {
		await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(mockPrisma.orderNote.findUnique).toHaveBeenCalledWith({
			where: { id: NOTE_ID, deletedAt: null },
			select: { id: true, orderId: true, authorId: true },
		});
	});

	it("returns FORBIDDEN when admin is not the author", async () => {
		mockPrisma.orderNote.findUnique.mockResolvedValue({
			id: NOTE_ID,
			orderId: VALID_ORDER_ID,
			authorId: "other-admin",
		});
		const result = await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.orderNote.update).not.toHaveBeenCalled();
	});

	it("sanitizes content before persisting", async () => {
		await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(mockSanitizeText).toHaveBeenCalledWith(NEW_CONTENT);
	});

	it("trims whitespace from content", async () => {
		mockValidateInput.mockReturnValue({
			data: { noteId: NOTE_ID, content: "   spaced   " },
		});
		await updateOrderNote(NOTE_ID, "   spaced   ");
		expect(mockSanitizeText).toHaveBeenCalledWith("spaced");
	});

	it("updates the note with new content", async () => {
		await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(mockPrisma.orderNote.update).toHaveBeenCalledWith({
			where: { id: NOTE_ID },
			data: { content: NEW_CONTENT },
		});
	});

	it("invalidates order notes cache", async () => {
		await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-notes-${VALID_ORDER_ID}`);
	});

	it("does not invalidate cache when orderId is null", async () => {
		mockPrisma.orderNote.findUnique.mockResolvedValue({
			id: NOTE_ID,
			orderId: null,
			authorId: ADMIN_ID,
		});
		await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("returns success on update", async () => {
		const result = await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Note modifiée");
	});

	it("uses transaction for atomic operation", async () => {
		await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await updateOrderNote(NOTE_ID, NEW_CONTENT);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
