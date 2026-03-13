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
	mockSanitizeText,
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
	mockSanitizeText: vi.fn((text: string) => text),
	mockPrisma: {
		announcementBar: {
			findUnique: vi.fn(),
			update: vi.fn(),
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
	ADMIN_ANNOUNCEMENT_LIMITS: { UPDATE: "announcement:update" },
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("../../constants/cache", () => ({
	getAnnouncementInvalidationTags: mockGetInvalidationTags,
}));

import { updateAnnouncement } from "../update-announcement";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin_1", name: "Admin", email: "admin@synclune.fr" };

const VALID_DATA = {
	id: VALID_CUID,
	message: "Promo été",
	link: "/soldes",
	linkText: "En profiter",
	startsAt: new Date("2026-04-01"),
	endsAt: null,
	dismissDurationHours: 24,
};

const EXISTING_ANNOUNCEMENT = {
	id: VALID_CUID,
	message: "Ancien message",
};

function validFormData() {
	return createMockFormData({
		id: VALID_CUID,
		message: "Promo été",
		link: "/soldes",
		linkText: "En profiter",
		startsAt: "2026-04-01T10:00",
		dismissDurationHours: "24",
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateAnnouncement", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: VALID_DATA });
		mockPrisma.announcementBar.findUnique.mockResolvedValue(EXISTING_ANNOUNCEMENT);
		mockPrisma.announcementBar.update.mockResolvedValue({ id: VALID_CUID });
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

		const result = await updateAnnouncement(undefined, validFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.announcementBar.findUnique).not.toHaveBeenCalled();
	});

	// ─── Rate limit ───────────────────────────────────────────────────────────

	it("should return rate limit error when exceeded", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await updateAnnouncement(undefined, validFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.announcementBar.findUnique).not.toHaveBeenCalled();
	});

	// ─── Validation ───────────────────────────────────────────────────────────

	it("should return validation error for invalid input", async () => {
		const validationError = { status: ActionStatus.ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await updateAnnouncement(undefined, validFormData());

		expect(result).toEqual(validationError);
	});

	// ─── Existence check ──────────────────────────────────────────────────────

	it("should return error when announcement does not exist", async () => {
		mockPrisma.announcementBar.findUnique.mockResolvedValue(null);

		const result = await updateAnnouncement(undefined, validFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Cette annonce n'existe pas");
		expect(mockPrisma.announcementBar.update).not.toHaveBeenCalled();
	});

	// ─── Success ──────────────────────────────────────────────────────────────

	it("should update announcement with sanitized data", async () => {
		mockSanitizeText.mockImplementation((text: string) => `clean:${text}`);

		await updateAnnouncement(undefined, validFormData());

		expect(mockPrisma.announcementBar.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: {
				message: "clean:Promo été",
				link: "/soldes",
				linkText: "clean:En profiter",
				startsAt: VALID_DATA.startsAt,
				endsAt: null,
				dismissDurationHours: 24,
			},
		});
	});

	it("should set linkText to null when not provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { ...VALID_DATA, linkText: null },
		});

		await updateAnnouncement(undefined, validFormData());

		expect(mockPrisma.announcementBar.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: expect.objectContaining({ linkText: null }),
		});
	});

	// ─── Cache invalidation ───────────────────────────────────────────────────

	it("should invalidate all announcement cache tags", async () => {
		await updateAnnouncement(undefined, validFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("active-announcement");
		expect(mockUpdateTag).toHaveBeenCalledWith("announcements-list");
	});

	// ─── Audit log ────────────────────────────────────────────────────────────

	it("should log audit with target ID", async () => {
		await updateAnnouncement(undefined, validFormData());

		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: ADMIN_USER.id,
			adminName: ADMIN_USER.name,
			action: "announcement.update",
			targetType: "announcement",
			targetId: VALID_CUID,
			metadata: { message: VALID_DATA.message },
		});
	});

	// ─── Success return ───────────────────────────────────────────────────────

	it("should return success message", async () => {
		const result = await updateAnnouncement(undefined, validFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Annonce modifiée avec succès");
	});

	// ─── Error handling ───────────────────────────────────────────────────────

	it("should handle database errors gracefully", async () => {
		mockPrisma.announcementBar.update.mockRejectedValue(new Error("DB error"));

		const result = await updateAnnouncement(undefined, validFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la modification de l'annonce",
		);
	});
});
