import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
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
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockLogAudit: vi.fn(),
	mockSanitizeText: vi.fn((text: string) => text),
	mockPrisma: { announcementBar: { create: vi.fn() } },
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
	handleActionError: mockHandleActionError,
}));

vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ANNOUNCEMENT_LIMITS: { CREATE: "announcement:create" },
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("../../constants/cache", () => ({
	getAnnouncementInvalidationTags: mockGetInvalidationTags,
}));

import { createAnnouncement } from "../create-announcement";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin_1", name: "Admin", email: "admin@synclune.fr" };

const VALID_DATA = {
	message: "Livraison offerte",
	link: null,
	linkText: null,
	startsAt: undefined,
	endsAt: null,
	dismissDurationHours: 24,
};

function validFormData() {
	return createMockFormData({
		message: "Livraison offerte",
		dismissDurationHours: "24",
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("createAnnouncement", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: VALID_DATA });
		mockPrisma.announcementBar.create.mockResolvedValue({ id: "new-id" });
		mockGetInvalidationTags.mockReturnValue(["active-announcement", "announcements-list"]);
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
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

		const result = await createAnnouncement(undefined, validFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.announcementBar.create).not.toHaveBeenCalled();
	});

	// ─── Rate limit ───────────────────────────────────────────────────────────

	it("should return rate limit error when exceeded", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await createAnnouncement(undefined, validFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.announcementBar.create).not.toHaveBeenCalled();
	});

	it("should enforce rate limit with CREATE key", async () => {
		await createAnnouncement(undefined, validFormData());

		expect(mockEnforceRateLimit).toHaveBeenCalledWith("announcement:create");
	});

	// ─── Validation ───────────────────────────────────────────────────────────

	it("should return validation error for invalid input", async () => {
		const validationError = { status: ActionStatus.ERROR, message: "Message requis" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await createAnnouncement(undefined, validFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.announcementBar.create).not.toHaveBeenCalled();
	});

	it("should pass form data to validateInput", async () => {
		const fd = createMockFormData({
			message: "Test",
			link: "/soldes",
			linkText: "Voir",
			startsAt: "2026-04-01T10:00",
			endsAt: "2026-05-01T10:00",
			dismissDurationHours: "48",
		});

		await createAnnouncement(undefined, fd);

		expect(mockValidateInput).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({
				message: "Test",
				link: "/soldes",
				linkText: "Voir",
				dismissDurationHours: 48,
			}),
		);
	});

	// ─── Success ──────────────────────────────────────────────────────────────

	it("should create announcement with sanitized data", async () => {
		mockSanitizeText.mockImplementation((text: string) => `sanitized:${text}`);

		const data = {
			...VALID_DATA,
			message: "Promo <script>alert(1)</script>",
			linkText: "Voir <b>ici</b>",
			link: "/soldes",
		};
		mockValidateInput.mockReturnValue({ data });

		await createAnnouncement(undefined, validFormData());

		expect(mockPrisma.announcementBar.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				message: "sanitized:Promo <script>alert(1)</script>",
				linkText: "sanitized:Voir <b>ici</b>",
				link: "/soldes",
				isActive: false,
			}),
		});
	});

	it("should set isActive to false on creation", async () => {
		await createAnnouncement(undefined, validFormData());

		expect(mockPrisma.announcementBar.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ isActive: false }),
		});
	});

	it("should default startsAt to new Date() when not provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { ...VALID_DATA, startsAt: undefined },
		});

		await createAnnouncement(undefined, validFormData());

		const createCall = mockPrisma.announcementBar.create.mock.calls[0]![0];
		expect(createCall.data.startsAt).toBeInstanceOf(Date);
	});

	it("should use provided startsAt when specified", async () => {
		const startsAt = new Date("2026-04-01T10:00:00Z");
		mockValidateInput.mockReturnValue({
			data: { ...VALID_DATA, startsAt },
		});

		await createAnnouncement(undefined, validFormData());

		expect(mockPrisma.announcementBar.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ startsAt }),
		});
	});

	it("should set linkText to null when not provided", async () => {
		mockValidateInput.mockReturnValue({
			data: { ...VALID_DATA, linkText: null },
		});

		await createAnnouncement(undefined, validFormData());

		expect(mockPrisma.announcementBar.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ linkText: null }),
		});
	});

	// ─── Cache invalidation ───────────────────────────────────────────────────

	it("should invalidate all announcement cache tags", async () => {
		await createAnnouncement(undefined, validFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("active-announcement");
		expect(mockUpdateTag).toHaveBeenCalledWith("announcements-list");
	});

	// ─── Audit log ────────────────────────────────────────────────────────────

	it("should log audit with admin info", async () => {
		await createAnnouncement(undefined, validFormData());

		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: ADMIN_USER.id,
			adminName: ADMIN_USER.name,
			action: "announcement.create",
			targetType: "announcement",
			targetId: "new",
			metadata: { message: VALID_DATA.message },
		});
	});

	it("should use email as adminName when name is null", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			user: { ...ADMIN_USER, name: null },
		});

		await createAnnouncement(undefined, validFormData());

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({ adminName: ADMIN_USER.email }),
		);
	});

	// ─── Success return ───────────────────────────────────────────────────────

	it("should return success message", async () => {
		const result = await createAnnouncement(undefined, validFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Annonce créée avec succès");
	});

	// ─── Error handling ───────────────────────────────────────────────────────

	it("should handle database errors gracefully", async () => {
		mockPrisma.announcementBar.create.mockRejectedValue(new Error("DB error"));

		const result = await createAnnouncement(undefined, validFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la création de l'annonce",
		);
	});
});
