import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockUpdateTag,
	mockGetStoreSettingsInvalidationTags,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockPrisma: {
		storeSettings: { findUnique: vi.fn(), update: vi.fn() },
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetStoreSettingsInvalidationTags: vi.fn(),
	mockLogAudit: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_STORE_SETTINGS_LIMITS: { UPDATE_ANNOUNCEMENT: "update-ann" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("../../constants/cache", () => ({
	STORE_SETTINGS_SINGLETON_ID: "store-settings-singleton",
	getStoreSettingsInvalidationTags: mockGetStoreSettingsInvalidationTags,
}));
vi.mock("../../schemas/store-settings.schemas", () => ({
	updateAnnouncementSchema: {},
}));

import { updateAnnouncement } from "../update-announcement";

const ADMIN_USER = { id: "admin-1", name: "Admin", email: "admin@test.com" };

function formData(overrides: Record<string, string> = {}) {
	return createMockFormData({
		message: "Livraison offerte",
		link: "/collections/promo",
		startsAt: "",
		endsAt: "",
		isActive: "on",
		...overrides,
	});
}

function validData(overrides: Record<string, unknown> = {}) {
	return {
		message: "Livraison offerte",
		link: "/collections/promo",
		startsAt: null,
		endsAt: null,
		isActive: true,
		...overrides,
	};
}

describe("updateAnnouncement", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({});
		mockValidateInput.mockReturnValue({ data: validData() });
		mockGetStoreSettingsInvalidationTags.mockReturnValue(["store-status", "store-announcement"]);
		mockPrisma.storeSettings.findUnique.mockResolvedValue({ id: "store-settings-singleton" });
		mockPrisma.storeSettings.update.mockResolvedValue({});
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
	});

	it("rejects non-admin callers", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await updateAnnouncement(undefined, formData());
		expect(result).toEqual({ status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" });
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("enforces rate limit", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await updateAnnouncement(undefined, formData());
		expect(result.message).toBe("Trop de requêtes");
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("returns validation error when schema rejects input", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.ERROR, message: "Message requis" },
		});
		const result = await updateAnnouncement(undefined, formData());
		expect(result.message).toBe("Message requis");
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("writes all 5 announcement fields and invalidates cache tags", async () => {
		await updateAnnouncement(undefined, formData());
		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith({
			where: { id: "store-settings-singleton" },
			data: {
				announcementMessage: "Livraison offerte",
				announcementLink: "/collections/promo",
				announcementStartsAt: null,
				announcementEndsAt: null,
				announcementIsActive: true,
			},
		});
		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-announcement");
	});

	it("logs an audit entry with action=store.update-announcement", async () => {
		await updateAnnouncement(undefined, formData());
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: "admin-1",
				action: "store.update-announcement",
				targetType: "storeSettings",
				targetId: "store-settings-singleton",
			}),
		);
	});

	it("returns 'publiée' when active, 'enregistrée' when inactive", async () => {
		mockValidateInput.mockReturnValueOnce({ data: validData({ isActive: true }) });
		const active = await updateAnnouncement(undefined, formData());
		expect(active.message).toBe("Annonce publiée");

		mockValidateInput.mockReturnValueOnce({ data: validData({ isActive: false }) });
		const inactive = await updateAnnouncement(undefined, formData());
		expect(inactive.message).toBe("Annonce enregistrée");
	});

	it("errors when the singleton row is missing", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		const result = await updateAnnouncement(undefined, formData());
		expect(result.message).toBe("Paramètres boutique introuvables");
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});
});
