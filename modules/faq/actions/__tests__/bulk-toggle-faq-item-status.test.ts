import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_CUID, VALID_CUID_2 } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockSafeFormGetJSON,
	mockHandleActionError,
	mockSuccess,
	mockLogAudit,
	mockGetFaqInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		faqItem: { updateMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSafeFormGetJSON: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockLogAudit: vi.fn(),
	mockGetFaqInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_FAQ_LIMITS: { BULK_OPERATIONS: "faq-bulk-operations" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	safeFormGetJSON: mockSafeFormGetJSON,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
vi.mock("../../schemas/faq.schemas", () => ({ bulkToggleFaqItemStatusSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getFaqInvalidationTags: mockGetFaqInvalidationTags,
}));

import { bulkToggleFaqItemStatus } from "../bulk-toggle-faq-item-status";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin", email: "admin@synclune.fr" };

function formData(isActive: boolean) {
	const fd = new FormData();
	fd.append("ids", JSON.stringify([VALID_CUID, VALID_CUID_2]));
	fd.append("isActive", String(isActive));
	return fd;
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkToggleFaqItemStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeFormGetJSON.mockReturnValue([VALID_CUID, VALID_CUID_2]);
		mockValidateInput.mockReturnValue({
			data: { ids: [VALID_CUID, VALID_CUID_2], isActive: true },
		});
		mockGetFaqInvalidationTags.mockReturnValue(["faq-items", "faq-items-list"]);
		mockPrisma.faqItem.updateMany.mockResolvedValue({ count: 2 });

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockLogAudit.mockResolvedValue(undefined);
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await bulkToggleFaqItemStatus(undefined, formData(true));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.faqItem.updateMany).not.toHaveBeenCalled();
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await bulkToggleFaqItemStatus(undefined, formData(true));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should enforce rate limit with BULK_OPERATIONS key", async () => {
		await bulkToggleFaqItemStatus(undefined, formData(true));
		expect(mockEnforceRateLimit).toHaveBeenCalledWith("faq-bulk-operations");
	});

	it("should default to empty array when ids JSON is missing", async () => {
		mockSafeFormGetJSON.mockReturnValue(null);
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await bulkToggleFaqItemStatus(undefined, formData(true));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockValidateInput).toHaveBeenCalledWith(expect.anything(), {
			ids: [],
			isActive: true,
		});
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await bulkToggleFaqItemStatus(undefined, formData(true));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should call updateMany with isActive=true", async () => {
		await bulkToggleFaqItemStatus(undefined, formData(true));
		expect(mockPrisma.faqItem.updateMany).toHaveBeenCalledWith({
			where: { id: { in: [VALID_CUID, VALID_CUID_2] } },
			data: { isActive: true },
		});
	});

	it("should call updateMany with isActive=false", async () => {
		mockValidateInput.mockReturnValue({
			data: { ids: [VALID_CUID, VALID_CUID_2], isActive: false },
		});
		await bulkToggleFaqItemStatus(undefined, formData(false));
		expect(mockPrisma.faqItem.updateMany).toHaveBeenCalledWith({
			where: { id: { in: [VALID_CUID, VALID_CUID_2] } },
			data: { isActive: false },
		});
	});

	it("should invalidate cache after update", async () => {
		await bulkToggleFaqItemStatus(undefined, formData(true));
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items");
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items-list");
	});

	it("should log audit with count and isActive metadata", async () => {
		await bulkToggleFaqItemStatus(undefined, formData(true));
		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: ADMIN_USER.id,
			adminName: ADMIN_USER.name,
			action: "faq.bulkToggleStatus",
			targetType: "faq",
			targetId: `${VALID_CUID},${VALID_CUID_2}`,
			metadata: { count: 2, isActive: true },
		});
	});

	it("should return success with plural for activated count > 1", async () => {
		const result = await bulkToggleFaqItemStatus(undefined, formData(true));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("2 questions activées avec succès");
	});

	it("should return success with deactivated count = 1", async () => {
		mockValidateInput.mockReturnValue({
			data: { ids: [VALID_CUID], isActive: false },
		});
		mockPrisma.faqItem.updateMany.mockResolvedValue({ count: 1 });
		await bulkToggleFaqItemStatus(undefined, formData(false));
		expect(mockSuccess).toHaveBeenCalledWith("1 question désactivée avec succès");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.faqItem.updateMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkToggleFaqItemStatus(undefined, formData(true));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
