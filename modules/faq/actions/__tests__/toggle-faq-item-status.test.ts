import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

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
		faqItem: { findUnique: vi.fn(), update: vi.fn() },
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
	ADMIN_FAQ_LIMITS: { TOGGLE_STATUS: "faq-toggle-status" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../schemas/faq.schemas", () => ({ toggleFaqItemStatusSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getFaqInvalidationTags: mockGetFaqInvalidationTags,
}));

import { toggleFaqItemStatus } from "../toggle-faq-item-status";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin", email: "admin@synclune.fr" };

function validFormData(isActive: boolean) {
	return createMockFormData({ id: VALID_CUID, isActive: String(isActive) });
}

// ============================================================================
// TESTS
// ============================================================================

describe("toggleFaqItemStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: true } });
		mockGetFaqInvalidationTags.mockReturnValue(["faq-items", "faq-items-list"]);
		mockPrisma.faqItem.findUnique.mockResolvedValue({
			id: VALID_CUID,
			isActive: false,
			question: "Comment passer commande ?",
		});
		mockPrisma.faqItem.update.mockResolvedValue({ id: VALID_CUID });

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
		const result = await toggleFaqItemStatus(undefined, validFormData(true));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.faqItem.update).not.toHaveBeenCalled();
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await toggleFaqItemStatus(undefined, validFormData(true));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should enforce rate limit with TOGGLE_STATUS key", async () => {
		await toggleFaqItemStatus(undefined, validFormData(true));
		expect(mockEnforceRateLimit).toHaveBeenCalledWith("faq-toggle-status");
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await toggleFaqItemStatus(undefined, validFormData(true));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when FAQ item does not exist", async () => {
		mockPrisma.faqItem.findUnique.mockResolvedValue(null);
		const result = await toggleFaqItemStatus(undefined, validFormData(true));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Cette question FAQ n'existe pas");
		expect(mockPrisma.faqItem.update).not.toHaveBeenCalled();
	});

	it("should short-circuit when status is already the desired value", async () => {
		mockPrisma.faqItem.findUnique.mockResolvedValue({
			id: VALID_CUID,
			isActive: true,
			question: "Q?",
		});
		const result = await toggleFaqItemStatus(undefined, validFormData(true));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Question déjà active");
		expect(mockPrisma.faqItem.update).not.toHaveBeenCalled();
	});

	it("should update isActive to true", async () => {
		await toggleFaqItemStatus(undefined, validFormData(true));
		expect(mockPrisma.faqItem.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { isActive: true },
		});
	});

	it("should update isActive to false", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: false } });
		mockPrisma.faqItem.findUnique.mockResolvedValue({
			id: VALID_CUID,
			isActive: true,
			question: "Q?",
		});
		await toggleFaqItemStatus(undefined, validFormData(false));
		expect(mockPrisma.faqItem.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { isActive: false },
		});
	});

	it("should log audit with question and isActive", async () => {
		await toggleFaqItemStatus(undefined, validFormData(true));
		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: ADMIN_USER.id,
			adminName: ADMIN_USER.name,
			action: "faq.toggleStatus",
			targetType: "faq",
			targetId: VALID_CUID,
			metadata: { question: "Comment passer commande ?", isActive: true },
		});
	});

	it("should invalidate cache after update", async () => {
		await toggleFaqItemStatus(undefined, validFormData(true));
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items");
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items-list");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.faqItem.update.mockRejectedValue(new Error("DB crash"));
		const result = await toggleFaqItemStatus(undefined, validFormData(true));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
