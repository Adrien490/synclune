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
	ADMIN_STORE_SETTINGS_LIMITS: { SCHEDULE_CLOSURE: "schedule" },
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
	scheduleClosureSchema: {},
}));

import { scheduleClosure } from "../schedule-closure";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin Test", email: "admin@test.com" };
const SINGLETON_ID = "store-settings-singleton";
const SCHEDULED_DATE = new Date("2030-07-01T10:00:00Z");
const REOPEN_DATE = new Date("2030-07-15T10:00:00Z");

function formData(overrides: Record<string, string> = {}) {
	return createMockFormData({
		scheduledCloseAt: SCHEDULED_DATE.toISOString(),
		closureMessage: "Vacances d'été",
		reopensAt: REOPEN_DATE.toISOString(),
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("scheduleClosure", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: {
				scheduledCloseAt: SCHEDULED_DATE,
				closureMessage: "Vacances d'été",
				reopensAt: REOPEN_DATE,
			},
		});
		mockPrisma.storeSettings.findUnique.mockResolvedValue({
			isClosed: false,
			scheduledCloseAt: null,
		});
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
		const result = await scheduleClosure(undefined, formData());
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await scheduleClosure(undefined, formData());
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ─── Validation ────────────────────────────────────────────────────────

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Date requise" },
		});
		const result = await scheduleClosure(undefined, formData());
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	// ─── Pre-conditions ────────────────────────────────────────────────────

	it("rejects when store is already closed", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue({
			isClosed: true,
			scheduledCloseAt: null,
		});
		await scheduleClosure(undefined, formData());
		expect(mockError).toHaveBeenCalledWith(
			"La boutique est déjà fermée, impossible de planifier une fermeture",
		);
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("returns error when singleton does not exist", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		await scheduleClosure(undefined, formData());
		expect(mockError).toHaveBeenCalledWith("Paramètres boutique introuvables");
	});

	// ─── Mutation ──────────────────────────────────────────────────────────

	it("writes scheduledCloseAt, closureMessage, and reopensAt", async () => {
		await scheduleClosure(undefined, formData());
		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith({
			where: { id: SINGLETON_ID },
			data: {
				scheduledCloseAt: SCHEDULED_DATE,
				closureMessage: "Vacances d'été",
				reopensAt: REOPEN_DATE,
			},
		});
	});

	it("overwrites any existing scheduled closure", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue({
			isClosed: false,
			scheduledCloseAt: new Date("2030-01-01T00:00:00Z"),
		});
		await scheduleClosure(undefined, formData());
		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ scheduledCloseAt: SCHEDULED_DATE }),
			}),
		);
	});

	// ─── Cache + audit ─────────────────────────────────────────────────────

	it("invalidates all cache tags", async () => {
		await scheduleClosure(undefined, formData());
		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-settings");
	});

	it("logs audit with store.schedule-closure action and full metadata", async () => {
		await scheduleClosure(undefined, formData());
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "store.schedule-closure",
				targetId: SINGLETON_ID,
				metadata: {
					scheduledCloseAt: SCHEDULED_DATE.toISOString(),
					closureMessage: "Vacances d'été",
					reopensAt: REOPEN_DATE.toISOString(),
				},
			}),
		);
	});

	// ─── Error handling ────────────────────────────────────────────────────

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.storeSettings.update.mockRejectedValue(new Error("DB crash"));
		const result = await scheduleClosure(undefined, formData());
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de planifier la fermeture",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
