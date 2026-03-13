import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

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
		faqItem: { aggregate: vi.fn(), create: vi.fn() },
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
	ADMIN_FAQ_LIMITS: { CREATE: "faq-create" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../schemas/faq.schemas", () => ({ createFaqItemSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getFaqInvalidationTags: mockGetFaqInvalidationTags,
}));
vi.mock("../../services/faq-link-validator.service", () => ({
	validateFaqLinksConsistency: mockValidateFaqLinksConsistency,
}));

import { createFaqItem } from "../create-faq-item";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	question: "Comment passer commande ?",
	answer: "Ajoutez au panier puis {{link0}}.",
	links: JSON.stringify([{ text: "cliquez ici", href: "/boutique" }]),
	isActive: "true",
});

const validData = {
	question: "Comment passer commande ?",
	answer: "Ajoutez au panier puis {{link0}}.",
	links: [{ text: "cliquez ici", href: "/boutique" }],
	isActive: true,
};

// ============================================================================
// TESTS
// ============================================================================

describe("createFaqItem", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: validData });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockGetFaqInvalidationTags.mockReturnValue(["faq-items", "faq-items-list"]);
		mockValidateFaqLinksConsistency.mockReturnValue(null);
		mockPrisma.faqItem.aggregate.mockResolvedValue({ _max: { position: 2 } });
		mockPrisma.faqItem.create.mockResolvedValue({ id: "faq-1" });

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
		const result = await createFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await createFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await createFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when links are inconsistent with answer", async () => {
		mockValidateFaqLinksConsistency.mockReturnValue("Lien manquant dans la réponse");
		const result = await createFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Lien manquant dans la réponse");
	});

	it("should auto-increment position from max", async () => {
		await createFaqItem(undefined, validFormData);
		expect(mockPrisma.faqItem.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ position: 3 }),
		});
	});

	it("should start at position 0 when no items exist", async () => {
		mockPrisma.faqItem.aggregate.mockResolvedValue({ _max: { position: null } });
		await createFaqItem(undefined, validFormData);
		expect(mockPrisma.faqItem.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ position: 0 }),
		});
	});

	it("should sanitize question and answer", async () => {
		mockSanitizeText.mockImplementation((t: string) => `sanitized:${t}`);
		await createFaqItem(undefined, validFormData);
		expect(mockPrisma.faqItem.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				question: `sanitized:${validData.question}`,
				answer: `sanitized:${validData.answer}`,
			}),
		});
	});

	it("should create FAQ item with all fields", async () => {
		const result = await createFaqItem(undefined, validFormData);
		expect(mockPrisma.faqItem.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				question: validData.question,
				answer: validData.answer,
				links: validData.links,
				isActive: true,
			}),
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate cache after creation", async () => {
		await createFaqItem(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items");
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items-list");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.faqItem.create.mockRejectedValue(new Error("DB crash"));
		const result = await createFaqItem(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
