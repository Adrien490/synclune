import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_CUID, VALID_ORDER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockSoftDelete,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockUpdateTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		orderNote: { findUnique: vi.fn() },
	},
	mockSoftDelete: {
		orderNote: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	softDelete: mockSoftDelete,
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
vi.mock("../../schemas/order.schemas", () => ({
	deleteOrderNoteSchema: {},
}));
vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: { NOTES: (id: string) => `order-notes-${id}` },
}));

import { deleteOrderNote } from "../delete-order-note";

// ============================================================================
// TESTS
// ============================================================================

const NOTE_ID = VALID_CUID;

describe("deleteOrderNote", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { noteId: NOTE_ID } });
		mockPrisma.orderNote.findUnique.mockResolvedValue({
			id: NOTE_ID,
			orderId: VALID_ORDER_ID,
		});
		mockSoftDelete.orderNote.mockResolvedValue({});

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
		const result = await deleteOrderNote(NOTE_ID);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await deleteOrderNote(NOTE_ID);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" },
		});
		const result = await deleteOrderNote("");
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns error when note does not exist", async () => {
		mockPrisma.orderNote.findUnique.mockResolvedValue(null);
		const result = await deleteOrderNote(NOTE_ID);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Note non trouvee");
	});

	it("soft-deletes the note (legal compliance)", async () => {
		await deleteOrderNote(NOTE_ID);
		expect(mockSoftDelete.orderNote).toHaveBeenCalledWith(NOTE_ID);
	});

	it("invalidates order notes cache", async () => {
		await deleteOrderNote(NOTE_ID);
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-notes-${VALID_ORDER_ID}`);
	});

	it("does not invalidate cache when orderId is null", async () => {
		mockPrisma.orderNote.findUnique.mockResolvedValue({
			id: NOTE_ID,
			orderId: null,
		});
		await deleteOrderNote(NOTE_ID);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("returns success on delete", async () => {
		const result = await deleteOrderNote(NOTE_ID);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockSoftDelete.orderNote.mockRejectedValue(new Error("DB crash"));
		const result = await deleteOrderNote(NOTE_ID);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
