import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockUpdateTag,
	mockLogAudit,
	mockPrisma,
	mockGetInvalidationTags,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockLogAudit: vi.fn(),
	mockPrisma: {
		announcementBar: {
			findUnique: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockGetInvalidationTags: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	handleActionError: mockHandleActionError,
}));

vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ANNOUNCEMENT_LIMITS: { TOGGLE_STATUS: "announcement:toggle" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("../../constants/cache", () => ({
	getAnnouncementInvalidationTags: mockGetInvalidationTags,
}));

import { toggleAnnouncementStatus } from "../toggle-announcement-status";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin_1", name: "Admin", email: "admin@synclune.fr" };

const EXISTING_ANNOUNCEMENT = {
	id: VALID_CUID,
	message: "Promo été",
	isActive: false,
};

function formDataForToggle(isActive: boolean) {
	return createMockFormData({
		id: VALID_CUID,
		isActive: String(isActive),
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("toggleAnnouncementStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: true } });
		mockPrisma.announcementBar.findUnique.mockResolvedValue(EXISTING_ANNOUNCEMENT);
		mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { id: VALID_CUID }]);
		mockPrisma.announcementBar.updateMany.mockReturnValue({ prismaPromise: "updateMany" });
		mockPrisma.announcementBar.update.mockReturnValue({ prismaPromise: "update" });
		mockGetInvalidationTags.mockReturnValue(["active-announcement", "announcements-list"]);
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockLogAudit.mockResolvedValue(undefined);
	});

	// ─── Auth ─────────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(result).toEqual(authError);
	});

	// ─── Rate limit ───────────────────────────────────────────────────────────

	it("should return rate limit error when exceeded", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(result).toEqual(rateLimitError);
	});

	it("should enforce rate limit with TOGGLE_STATUS key", async () => {
		await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(mockEnforceRateLimit).toHaveBeenCalledWith("announcement:toggle");
	});

	// ─── Validation ───────────────────────────────────────────────────────────

	it("should return validation error for invalid input", async () => {
		const validationError = { status: ActionStatus.ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(result).toEqual(validationError);
	});

	it("should parse isActive from form data as boolean", async () => {
		await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(mockValidateInput).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ isActive: true }),
		);
	});

	it("should parse isActive=false correctly", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: false } });

		await toggleAnnouncementStatus(undefined, formDataForToggle(false));

		expect(mockValidateInput).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ isActive: false }),
		);
	});

	// ─── Existence check ──────────────────────────────────────────────────────

	it("should return error when announcement does not exist", async () => {
		mockPrisma.announcementBar.findUnique.mockResolvedValue(null);

		const result = await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Cette annonce n'existe pas");
	});

	// ─── Activate (transaction) ───────────────────────────────────────────────

	it("should use transaction when activating to deactivate others", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: true } });

		await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(mockPrisma.$transaction).toHaveBeenCalledWith([
			expect.anything(), // updateMany to deactivate others
			expect.anything(), // update to activate this one
		]);
	});

	it("should deactivate all other active announcements in transaction", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: true } });

		await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(mockPrisma.announcementBar.updateMany).toHaveBeenCalledWith({
			where: { isActive: true, id: { not: VALID_CUID } },
			data: { isActive: false },
		});
	});

	it("should activate the target announcement in transaction", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: true } });

		await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(mockPrisma.announcementBar.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { isActive: true },
		});
	});

	// ─── Deactivate (simple update) ───────────────────────────────────────────

	it("should use simple update when deactivating (no transaction)", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: false } });

		await toggleAnnouncementStatus(undefined, formDataForToggle(false));

		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		expect(mockPrisma.announcementBar.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { isActive: false },
		});
	});

	// ─── Cache invalidation ───────────────────────────────────────────────────

	it("should invalidate cache tags after activation", async () => {
		await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(mockUpdateTag).toHaveBeenCalledWith("active-announcement");
		expect(mockUpdateTag).toHaveBeenCalledWith("announcements-list");
	});

	it("should invalidate cache tags after deactivation", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: false } });

		await toggleAnnouncementStatus(undefined, formDataForToggle(false));

		expect(mockUpdateTag).toHaveBeenCalledWith("active-announcement");
		expect(mockUpdateTag).toHaveBeenCalledWith("announcements-list");
	});

	// ─── Audit log ────────────────────────────────────────────────────────────

	it("should log audit with isActive in metadata", async () => {
		await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: ADMIN_USER.id,
			adminName: ADMIN_USER.name,
			action: "announcement.toggleStatus",
			targetType: "announcement",
			targetId: VALID_CUID,
			metadata: { message: EXISTING_ANNOUNCEMENT.message, isActive: true },
		});
	});

	// ─── Success return ───────────────────────────────────────────────────────

	it("should return activation success message", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: true } });

		const result = await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Annonce activée avec succès");
	});

	it("should return deactivation success message", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: false } });

		const result = await toggleAnnouncementStatus(undefined, formDataForToggle(false));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Annonce désactivée avec succès");
	});

	// ─── Error handling ───────────────────────────────────────────────────────

	it("should handle transaction errors gracefully", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("Transaction failed"));

		const result = await toggleAnnouncementStatus(undefined, formDataForToggle(true));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de modifier le statut de l'annonce",
		);
	});
});
