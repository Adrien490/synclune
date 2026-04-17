import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockNotFound,
	mockHandleActionError,
	mockInvalidateCache,
	mockLogAudit,
	mockPrisma,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockInvalidateCache: vi.fn(),
	mockLogAudit: vi.fn(),
	mockPrisma: {
		announcementBar: {
			findUnique: vi.fn(),
			create: vi.fn(),
		},
	},
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
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
}));

vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ANNOUNCEMENT_LIMITS: { DUPLICATE: "announcement:duplicate" },
}));
vi.mock("../../constants/cache", () => ({
	invalidateAnnouncementCache: mockInvalidateCache,
}));

import { duplicateAnnouncement } from "../duplicate-announcement";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin_1", name: "Admin", email: "admin@synclune.fr" };

const SOURCE = {
	message: "Promo été",
	link: "/promo",
	linkText: "Voir l'offre",
	dismissDurationHours: 48,
};

const DUPLICATED = { id: VALID_CUID_2, message: "Promo été" };

function validFormData() {
	return createMockFormData({ id: VALID_CUID });
}

// ============================================================================
// TESTS
// ============================================================================

describe("duplicateAnnouncement", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-17T10:00:00.000Z"));

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID } });
		mockPrisma.announcementBar.findUnique.mockResolvedValue(SOURCE);
		mockPrisma.announcementBar.create.mockResolvedValue(DUPLICATED);
		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockNotFound.mockImplementation((resource: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${resource} non trouvée`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockLogAudit.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// ─── Auth ─────────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await duplicateAnnouncement(undefined, validFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.announcementBar.findUnique).not.toHaveBeenCalled();
	});

	// ─── Rate limit ───────────────────────────────────────────────────────────

	it("should return rate limit error when exceeded", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await duplicateAnnouncement(undefined, validFormData());

		expect(result).toEqual(rateLimitError);
	});

	it("should enforce rate limit with DUPLICATE key", async () => {
		await duplicateAnnouncement(undefined, validFormData());

		expect(mockEnforceRateLimit).toHaveBeenCalledWith("announcement:duplicate");
	});

	// ─── Validation ───────────────────────────────────────────────────────────

	it("should return validation error for invalid input", async () => {
		const validationError = { status: ActionStatus.ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await duplicateAnnouncement(undefined, validFormData());

		expect(result).toEqual(validationError);
	});

	// ─── Source not found ─────────────────────────────────────────────────────

	it("should return notFound when source announcement does not exist", async () => {
		mockPrisma.announcementBar.findUnique.mockResolvedValue(null);

		const result = await duplicateAnnouncement(undefined, validFormData());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("L'annonce source");
		expect(mockPrisma.announcementBar.create).not.toHaveBeenCalled();
	});

	// ─── Duplication core ─────────────────────────────────────────────────────

	it("should duplicate with isActive=false, startsAt=now, endsAt=null", async () => {
		await duplicateAnnouncement(undefined, validFormData());

		expect(mockPrisma.announcementBar.create).toHaveBeenCalledWith({
			data: {
				message: SOURCE.message,
				link: SOURCE.link,
				linkText: SOURCE.linkText,
				dismissDurationHours: SOURCE.dismissDurationHours,
				isActive: false,
				startsAt: new Date("2026-04-17T10:00:00.000Z"),
				endsAt: null,
			},
			select: { id: true, message: true },
		});
	});

	it("should preserve null link and linkText from source", async () => {
		mockPrisma.announcementBar.findUnique.mockResolvedValue({
			...SOURCE,
			link: null,
			linkText: null,
		});

		await duplicateAnnouncement(undefined, validFormData());

		expect(mockPrisma.announcementBar.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ link: null, linkText: null }),
			}),
		);
	});

	// ─── Cache invalidation ───────────────────────────────────────────────────

	it("should invalidate all announcement cache tags", async () => {
		await duplicateAnnouncement(undefined, validFormData());

		expect(mockInvalidateCache).toHaveBeenCalledTimes(1);
	});

	// ─── Audit log ────────────────────────────────────────────────────────────

	it("should log audit with sourceId in metadata", async () => {
		await duplicateAnnouncement(undefined, validFormData());

		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: ADMIN_USER.id,
			adminName: ADMIN_USER.name,
			action: "announcement.duplicate",
			targetType: "announcement",
			targetId: DUPLICATED.id,
			metadata: { sourceId: VALID_CUID, message: DUPLICATED.message },
		});
	});

	// ─── Success return ───────────────────────────────────────────────────────

	it("should return success with duplicated id", async () => {
		const result = await duplicateAnnouncement(undefined, validFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Annonce dupliquée avec succès", {
			id: DUPLICATED.id,
		});
	});

	// ─── Error handling ───────────────────────────────────────────────────────

	it("should handle database errors gracefully", async () => {
		mockPrisma.announcementBar.create.mockRejectedValue(new Error("DB error"));

		const result = await duplicateAnnouncement(undefined, validFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la duplication de l'annonce",
		);
	});
});
