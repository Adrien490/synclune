import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_CUID, VALID_CUID_2 } from "@/test/factories";

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
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
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
	ADMIN_ANNOUNCEMENT_LIMITS: { BULK_DELETE: "announcement:bulk-delete" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("../../constants/cache", () => ({
	getAnnouncementInvalidationTags: mockGetInvalidationTags,
}));

import { bulkDeleteAnnouncements } from "../bulk-delete-announcements";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin_1", name: "Admin", email: "admin@synclune.fr" };

function formDataWithIds(ids: string[]): FormData {
	const fd = new FormData();
	for (const id of ids) fd.append("ids", id);
	return fd;
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeleteAnnouncements", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { ids: [VALID_CUID, VALID_CUID_2] },
		});
		mockPrisma.announcementBar.findMany.mockResolvedValue([
			{ id: VALID_CUID, message: "Promo été" },
			{ id: VALID_CUID_2, message: "Promo hiver" },
		]);
		mockPrisma.announcementBar.deleteMany.mockResolvedValue({ count: 2 });
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

		const result = await bulkDeleteAnnouncements(undefined, formDataWithIds([VALID_CUID]));

		expect(result).toEqual(authError);
		expect(mockPrisma.announcementBar.findMany).not.toHaveBeenCalled();
	});

	// ─── Rate limit ───────────────────────────────────────────────────────────

	it("should return rate limit error when exceeded", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkDeleteAnnouncements(undefined, formDataWithIds([VALID_CUID]));

		expect(result).toEqual(rateLimitError);
	});

	it("should enforce rate limit with BULK_DELETE key", async () => {
		await bulkDeleteAnnouncements(undefined, formDataWithIds([VALID_CUID]));

		expect(mockEnforceRateLimit).toHaveBeenCalledWith("announcement:bulk-delete");
	});

	// ─── Validation ───────────────────────────────────────────────────────────

	it("should pass formData.getAll('ids') to validateInput", async () => {
		await bulkDeleteAnnouncements(undefined, formDataWithIds([VALID_CUID, VALID_CUID_2]));

		expect(mockValidateInput).toHaveBeenCalledWith(expect.anything(), {
			ids: [VALID_CUID, VALID_CUID_2],
		});
	});

	it("should return validation error for invalid input", async () => {
		const validationError = { status: ActionStatus.ERROR, message: "Au moins un id requis" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkDeleteAnnouncements(undefined, formDataWithIds([]));

		expect(result).toEqual(validationError);
	});

	// ─── Existence check ──────────────────────────────────────────────────────

	it("should return error when no announcements are found", async () => {
		mockPrisma.announcementBar.findMany.mockResolvedValue([]);

		const result = await bulkDeleteAnnouncements(undefined, formDataWithIds([VALID_CUID]));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Aucune annonce trouvée");
		expect(mockPrisma.announcementBar.deleteMany).not.toHaveBeenCalled();
	});

	// ─── Hard delete ──────────────────────────────────────────────────────────

	it("should perform hard deleteMany on existing ids only", async () => {
		await bulkDeleteAnnouncements(undefined, formDataWithIds([VALID_CUID, VALID_CUID_2]));

		expect(mockPrisma.announcementBar.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: [VALID_CUID, VALID_CUID_2] } },
		});
	});

	// ─── Cache invalidation ───────────────────────────────────────────────────

	it("should invalidate all announcement cache tags", async () => {
		await bulkDeleteAnnouncements(undefined, formDataWithIds([VALID_CUID]));

		expect(mockUpdateTag).toHaveBeenCalledWith("active-announcement");
		expect(mockUpdateTag).toHaveBeenCalledWith("announcements-list");
	});

	// ─── Audit log ────────────────────────────────────────────────────────────

	it("should log audit with count + messages metadata", async () => {
		await bulkDeleteAnnouncements(undefined, formDataWithIds([VALID_CUID, VALID_CUID_2]));

		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: ADMIN_USER.id,
			adminName: ADMIN_USER.name,
			action: "announcement.bulkDelete",
			targetType: "announcement",
			targetId: `${VALID_CUID},${VALID_CUID_2}`,
			metadata: { count: 2, messages: ["Promo été", "Promo hiver"] },
		});
	});

	// ─── Success return ───────────────────────────────────────────────────────

	it("should return success message with count", async () => {
		const result = await bulkDeleteAnnouncements(
			undefined,
			formDataWithIds([VALID_CUID, VALID_CUID_2]),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("2 annonce(s) supprimée(s)");
	});

	it("should mention skipped count when some ids are missing", async () => {
		mockPrisma.announcementBar.findMany.mockResolvedValue([
			{ id: VALID_CUID, message: "Promo été" },
		]);

		await bulkDeleteAnnouncements(undefined, formDataWithIds([VALID_CUID, VALID_CUID_2]));

		expect(mockSuccess).toHaveBeenCalledWith("1 annonce(s) supprimée(s), 1 introuvable(s)");
	});

	// ─── Error handling ───────────────────────────────────────────────────────

	it("should handle database errors gracefully", async () => {
		mockPrisma.announcementBar.deleteMany.mockRejectedValue(new Error("DB error"));

		const result = await bulkDeleteAnnouncements(undefined, formDataWithIds([VALID_CUID]));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la suppression des annonces",
		);
	});
});
