import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

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
	ADMIN_STORE_SETTINGS_LIMITS: { CLOSE_STORE: "close-store" },
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
	closeStoreSchema: {},
}));

import { closeStore } from "../close-store";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin Test", email: "admin@test.com" };
const SINGLETON_ID = "store-settings-singleton";

function formData(overrides: Record<string, string> = {}) {
	return createMockFormData({
		closureMessage: "Maintenance",
		reopensAt: "",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("closeStore", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { closureMessage: "Maintenance", reopensAt: null },
		});
		mockPrisma.storeSettings.findUnique.mockResolvedValue({ isClosed: false });
		mockPrisma.storeSettings.update.mockResolvedValue({});
		mockGetStoreSettingsInvalidationTags.mockReturnValue(["store-status", "store-settings"]);
		mockLogAudit.mockResolvedValue(undefined);

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

	// ─── Auth & rate limit ─────────────────────────────────────────────────

	it("returns auth error when user is not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await closeStore(undefined, formData());
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
	});

	it("returns error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await closeStore(undefined, formData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockValidateInput).not.toHaveBeenCalled();
	});

	// ─── Validation ────────────────────────────────────────────────────────

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Message requis" },
		});
		const result = await closeStore(undefined, formData());
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	// ─── Idempotence ───────────────────────────────────────────────────────

	it("rejects when store is already closed", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue({ isClosed: true });
		await closeStore(undefined, formData());
		expect(mockError).toHaveBeenCalledWith("La boutique est déjà fermée");
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("returns error when singleton does not exist", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		await closeStore(undefined, formData());
		expect(mockError).toHaveBeenCalledWith("Paramètres boutique introuvables");
	});

	// ─── Mutation ──────────────────────────────────────────────────────────

	it("closes store with all required fields", async () => {
		const reopensAt = new Date("2030-01-01T10:00:00Z");
		mockValidateInput.mockReturnValue({
			data: { closureMessage: "Vacances", reopensAt },
		});
		await closeStore(undefined, formData());
		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith({
			where: { id: SINGLETON_ID },
			data: {
				isClosed: true,
				closureMessage: "Vacances",
				closedAt: expect.any(Date),
				closedBy: "Admin Test",
				reopensAt,
			},
		});
	});

	it("uses email as closedBy fallback when name is null", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: null, email: "admin@test.com" },
		});
		await closeStore(undefined, formData());
		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ closedBy: "admin@test.com" }),
			}),
		);
	});

	// ─── Cache + audit + success ──────────────────────────────────────────

	it("invalidates all cache tags", async () => {
		await closeStore(undefined, formData());
		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-settings");
	});

	it("logs audit with store.close action and metadata", async () => {
		const reopensAt = new Date("2030-01-01T10:00:00Z");
		mockValidateInput.mockReturnValue({
			data: { closureMessage: "Maintenance", reopensAt },
		});
		await closeStore(undefined, formData());
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "store.close",
				targetId: SINGLETON_ID,
				metadata: {
					closureMessage: "Maintenance",
					reopensAt: "2030-01-01T10:00:00.000Z",
				},
			}),
		);
	});

	it("returns success message", async () => {
		const result = await closeStore(undefined, formData());
		expect(result.message).toContain("fermée");
	});

	// ─── Error handling ────────────────────────────────────────────────────

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.storeSettings.update.mockRejectedValue(new Error("DB crash"));
		const result = await closeStore(undefined, formData());
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de fermer la boutique",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
