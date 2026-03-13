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
	mockSanitizeText,
	mockGetFaqInvalidationTags,
	mockValidateFaqLinksConsistency,
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
	mockSanitizeText: vi.fn(),
	mockGetFaqInvalidationTags: vi.fn(),
	mockValidateFaqLinksConsistency: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_FAQ_LIMITS: { UPDATE: "faq-update" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../schemas/faq.schemas", () => ({ updateFaqItemSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getFaqInvalidationTags: mockGetFaqInvalidationTags,
}));
vi.mock("../../services/faq-link-validator.service", () => ({
	validateFaqLinksConsistency: mockValidateFaqLinksConsistency,
}));

import { updateFaqItem } from "../update-faq-item";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	id: VALID_CUID,
	question: "Question modifiée ?",
	answer: "Réponse modifiée.",
	links: JSON.stringify([]),
	isActive: "true",
});

const validData = {
	id: VALID_CUID,
	question: "Question modifiée ?",
	answer: "Réponse modifiée.",
	links: [],
	isActive: true,
};

// ============================================================================
// TESTS
// ============================================================================

describe("updateFaqItem", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: validData });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockGetFaqInvalidationTags.mockReturnValue(["faq-items", "faq-items-list"]);
		mockValidateFaqLinksConsistency.mockReturnValue(null);
		mockPrisma.faqItem.findUnique.mockResolvedValue({ id: VALID_CUID, question: "Old" });
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
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await updateFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await updateFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await updateFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when links are inconsistent with answer", async () => {
		mockValidateFaqLinksConsistency.mockReturnValue("Placeholder manquant");
		const result = await updateFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Placeholder manquant");
	});

	it("should return error when FAQ item does not exist", async () => {
		mockPrisma.faqItem.findUnique.mockResolvedValue(null);
		const result = await updateFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("n'existe pas");
	});

	it("should sanitize question and answer", async () => {
		mockSanitizeText.mockImplementation((t: string) => `sanitized:${t}`);
		await updateFaqItem(undefined, validFormData);
		expect(mockPrisma.faqItem.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: expect.objectContaining({
				question: `sanitized:${validData.question}`,
				answer: `sanitized:${validData.answer}`,
			}),
		});
	});

	it("should update FAQ item with all fields", async () => {
		const result = await updateFaqItem(undefined, validFormData);
		expect(mockPrisma.faqItem.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: expect.objectContaining({
				question: validData.question,
				answer: validData.answer,
				links: validData.links,
				isActive: true,
			}),
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate cache after update", async () => {
		await updateFaqItem(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items");
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items-list");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.faqItem.update.mockRejectedValue(new Error("DB crash"));
		const result = await updateFaqItem(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
