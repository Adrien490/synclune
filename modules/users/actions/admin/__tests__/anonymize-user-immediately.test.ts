import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockUpdateTag,
	mockLogAudit,
	mockSuccess,
	mockError,
	mockNotFound,
	mockHandleActionError,
	mockAnonymizeUserInTransaction,
	mockGetUserFullInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockLogAudit: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockAnonymizeUserInTransaction: vi.fn(),
	mockGetUserFullInvalidationTags: vi.fn(() => ["tag-a"]),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { ANONYMIZE_NOW: "user-anonymize-now" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../../schemas/user-admin.schemas", () => ({ anonymizeUserImmediatelySchema: {} }));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_CUSTOMERS_LIST: "admin-customers-list",
		ADMIN_BADGES: "admin-badges",
	},
}));
vi.mock("../../../constants/cache", () => ({
	USERS_CACHE_TAGS: {
		ACCOUNTS_LIST: "accounts-list",
		CURRENT_USER: (id: string) => `current-user-${id}`,
	},
	getUserFullInvalidationTags: mockGetUserFullInvalidationTags,
}));
vi.mock("../../../services/anonymize-user.service", () => ({
	anonymizeUserInTransaction: mockAnonymizeUserInTransaction,
}));

import { anonymizeUserImmediately } from "../anonymize-user-immediately";

// ============================================================================
// HELPERS
// ============================================================================

const USER_ID = "tz4a98xxat96iws9zmbrgj3a";
const USER_EMAIL = "jane@example.com";

function createFormData(
	overrides: { id?: string; confirmation?: string; reason?: string } = {},
): FormData {
	const fd = new FormData();
	fd.set("id", overrides.id ?? USER_ID);
	fd.set("confirmation", overrides.confirmation ?? `ANONYMISER ${USER_EMAIL}`);
	fd.set("reason", overrides.reason ?? "Demande CNIL 2026-04-17 ref #1234");
	return fd;
}

// ============================================================================
// TESTS
// ============================================================================

describe("anonymizeUserImmediately", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com", role: "ADMIN" },
		});
		mockValidateInput.mockImplementation((_s: unknown, data: unknown) => ({
			data: data as { id: string; confirmation: string; reason: string },
		}));
		mockPrisma.user.findUnique.mockResolvedValue({
			id: USER_ID,
			email: USER_EMAIL,
			name: "Jane",
			accountStatus: "ACTIVE",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
			await fn({});
		});
		mockAnonymizeUserInTransaction.mockResolvedValue(undefined);
		mockGetUserFullInvalidationTags.mockReturnValue(["tag-a"]);
		mockLogAudit.mockResolvedValue(undefined);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockNotFound.mockImplementation((e: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${e} introuvable`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return rate limit error before touching DB", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await anonymizeUserImmediately(undefined, createFormData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "No" },
		});
		const result = await anonymizeUserImmediately(undefined, createFormData());
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("should return validation error when reason is too short", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Raison requise" },
		});
		const result = await anonymizeUserImmediately(undefined, createFormData({ reason: "x" }));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should block admin from anonymizing self", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				id: "admin-1",
				confirmation: "ANONYMISER admin@test.com",
				reason: "test test test",
			},
		});
		const result = await anonymizeUserImmediately(undefined, createFormData({ id: "admin-1" }));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("propre"));
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return not found when user does not exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);
		const result = await anonymizeUserImmediately(undefined, createFormData());
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should reject invalid confirmation text", async () => {
		mockValidateInput.mockReturnValue({
			data: { id: USER_ID, confirmation: "WRONG", reason: "valid reason here" },
		});
		const result = await anonymizeUserImmediately(
			undefined,
			createFormData({ confirmation: "WRONG" }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining(`ANONYMISER ${USER_EMAIL}`));
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return error when user is already anonymized", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({
			id: USER_ID,
			email: USER_EMAIL,
			name: "Jane",
			accountStatus: "ANONYMIZED",
		});
		const result = await anonymizeUserImmediately(undefined, createFormData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("deja anonymise"));
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should call the service with allowImmediate flag", async () => {
		await anonymizeUserImmediately(undefined, createFormData());
		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(mockAnonymizeUserInTransaction).toHaveBeenCalledWith(
			expect.anything(),
			USER_ID,
			expect.objectContaining({ allowImmediate: true }),
		);
	});

	it("should invalidate shared and per-user cache tags", async () => {
		await anonymizeUserImmediately(undefined, createFormData());
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("accounts-list");
		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith(USER_ID);
	});

	it("should log audit with reason and previousStatus", async () => {
		await anonymizeUserImmediately(undefined, createFormData());
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "user.anonymizeImmediately",
				targetType: "user",
				targetId: USER_ID,
				metadata: expect.objectContaining({
					previousStatus: "ACTIVE",
					userEmail: USER_EMAIL,
					reason: "Demande CNIL 2026-04-17 ref #1234",
				}),
			}),
		);
	});

	it("should return success message referencing GDPR", async () => {
		const result = await anonymizeUserImmediately(undefined, createFormData());
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toMatch(/GDPR|Art\. 17/);
	});

	it("should call handleActionError on transaction exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("TX fail"));
		const result = await anonymizeUserImmediately(undefined, createFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
