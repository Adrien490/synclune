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
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockLogAudit,
	mockGetFaqInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		faqItem: { findMany: vi.fn(), deleteMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
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
	ADMIN_FAQ_LIMITS: { BULK_DELETE: "faq-bulk-delete" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../schemas/faq.schemas", () => ({ bulkDeleteFaqItemsSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getFaqInvalidationTags: mockGetFaqInvalidationTags,
}));

import { bulkDeleteFaqItems } from "../bulk-delete-faq-items";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin", email: "admin@synclune.fr" };

function formDataWithIds(ids: string[]): FormData {
	const fd = new FormData();
	for (const id of ids) fd.append("ids", id);
	return fd;
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeleteFaqItems", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { ids: [VALID_CUID, VALID_CUID_2] } });
		mockGetFaqInvalidationTags.mockReturnValue(["faq-items", "faq-items-list"]);
		mockPrisma.faqItem.findMany.mockResolvedValue([
			{ id: VALID_CUID, question: "Question 1 ?" },
			{ id: VALID_CUID_2, question: "Question 2 ?" },
		]);
		mockPrisma.faqItem.deleteMany.mockResolvedValue({ count: 2 });

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
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
		const result = await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID]));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.faqItem.findMany).not.toHaveBeenCalled();
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID]));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should enforce rate limit with BULK_DELETE key", async () => {
		await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID]));
		expect(mockEnforceRateLimit).toHaveBeenCalledWith("faq-bulk-delete");
	});

	it("should pass formData.getAll('ids') to validateInput", async () => {
		await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID, VALID_CUID_2]));
		expect(mockValidateInput).toHaveBeenCalledWith(expect.anything(), {
			ids: [VALID_CUID, VALID_CUID_2],
		});
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await bulkDeleteFaqItems(undefined, formDataWithIds([]));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when no FAQ items found", async () => {
		mockPrisma.faqItem.findMany.mockResolvedValue([]);
		const result = await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID]));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Aucune question FAQ trouvée");
		expect(mockPrisma.faqItem.deleteMany).not.toHaveBeenCalled();
	});

	it("should perform hard deleteMany on existing ids only", async () => {
		await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID, VALID_CUID_2]));
		expect(mockPrisma.faqItem.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: [VALID_CUID, VALID_CUID_2] } },
		});
	});

	it("should invalidate cache after deletion", async () => {
		await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID]));
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items");
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items-list");
	});

	it("should log audit with count and questions metadata", async () => {
		await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID, VALID_CUID_2]));
		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: ADMIN_USER.id,
			adminName: ADMIN_USER.name,
			action: "faq.bulkDelete",
			targetType: "faq",
			targetId: `${VALID_CUID},${VALID_CUID_2}`,
			metadata: { count: 2, questions: ["Question 1 ?", "Question 2 ?"] },
		});
	});

	it("should return success with count", async () => {
		const result = await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID, VALID_CUID_2]));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("2 question(s) supprimée(s)");
	});

	it("should mention skipped count when some ids are missing", async () => {
		mockPrisma.faqItem.findMany.mockResolvedValue([{ id: VALID_CUID, question: "Question 1 ?" }]);
		await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID, VALID_CUID_2]));
		expect(mockSuccess).toHaveBeenCalledWith("1 question(s) supprimée(s), 1 introuvable(s)");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.faqItem.deleteMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkDeleteFaqItems(undefined, formDataWithIds([VALID_CUID]));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
