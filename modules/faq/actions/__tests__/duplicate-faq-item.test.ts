import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

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
	mockNotFound,
	mockLogAudit,
	mockGetFaqInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		faqItem: { findUnique: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
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
	ADMIN_FAQ_LIMITS: { DUPLICATE: "faq-duplicate" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	notFound: mockNotFound,
}));
vi.mock("../../schemas/faq.schemas", () => ({ duplicateFaqItemSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getFaqInvalidationTags: mockGetFaqInvalidationTags,
}));

import { duplicateFaqItem } from "../duplicate-faq-item";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin", email: "admin@synclune.fr" };

const SOURCE = {
	question: "Comment passer commande ?",
	answer: "Ajoutez au panier puis {{link0}}.",
	links: [{ text: "cliquez ici", href: "/boutique" }],
};

const validFormData = createMockFormData({ id: VALID_CUID });

// ============================================================================
// TESTS
// ============================================================================

describe("duplicateFaqItem", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID } });
		mockGetFaqInvalidationTags.mockReturnValue(["faq-items", "faq-items-list"]);
		mockPrisma.faqItem.findUnique.mockResolvedValue(SOURCE);
		mockPrisma.faqItem.aggregate.mockResolvedValue({ _max: { position: 4 } });
		mockPrisma.faqItem.create.mockResolvedValue({
			id: VALID_CUID_2,
			question: "Comment passer commande ? (copie)",
		});

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockNotFound.mockImplementation((resource: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${resource} non trouvée`,
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
		const result = await duplicateFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.faqItem.create).not.toHaveBeenCalled();
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await duplicateFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should enforce rate limit with DUPLICATE key", async () => {
		await duplicateFaqItem(undefined, validFormData);
		expect(mockEnforceRateLimit).toHaveBeenCalledWith("faq-duplicate");
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await duplicateFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return notFound when source FAQ does not exist", async () => {
		mockPrisma.faqItem.findUnique.mockResolvedValue(null);
		const result = await duplicateFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("La question FAQ source");
		expect(mockPrisma.faqItem.create).not.toHaveBeenCalled();
	});

	it('should duplicate with "(copie)" suffix, isActive=false, position=max+1', async () => {
		await duplicateFaqItem(undefined, validFormData);
		expect(mockPrisma.faqItem.create).toHaveBeenCalledWith({
			data: {
				question: "Comment passer commande ? (copie)",
				answer: SOURCE.answer,
				links: SOURCE.links,
				position: 5,
				isActive: false,
			},
			select: { id: true, question: true },
		});
	});

	it("should start at position 0 when no items exist", async () => {
		mockPrisma.faqItem.aggregate.mockResolvedValue({ _max: { position: null } });
		await duplicateFaqItem(undefined, validFormData);
		expect(mockPrisma.faqItem.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ position: 0 }),
			}),
		);
	});

	it("should preserve null links from source", async () => {
		mockPrisma.faqItem.findUnique.mockResolvedValue({ ...SOURCE, links: null });
		await duplicateFaqItem(undefined, validFormData);
		expect(mockPrisma.faqItem.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ links: undefined }),
			}),
		);
	});

	it("should truncate question + suffix to fit 300 chars max", async () => {
		const longQuestion = "Q".repeat(300);
		mockPrisma.faqItem.findUnique.mockResolvedValue({ ...SOURCE, question: longQuestion });
		await duplicateFaqItem(undefined, validFormData);
		const callArg = mockPrisma.faqItem.create.mock.calls[0]?.[0] as {
			data: { question: string };
		};
		expect(callArg.data.question.length).toBe(300);
		expect(callArg.data.question.endsWith(" (copie)")).toBe(true);
	});

	it("should invalidate cache after duplication", async () => {
		await duplicateFaqItem(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items");
		expect(mockUpdateTag).toHaveBeenCalledWith("faq-items-list");
	});

	it("should log audit with sourceId and duplicated question", async () => {
		await duplicateFaqItem(undefined, validFormData);
		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: ADMIN_USER.id,
			adminName: ADMIN_USER.name,
			action: "faq.duplicate",
			targetType: "faq",
			targetId: VALID_CUID_2,
			metadata: {
				sourceId: VALID_CUID,
				question: "Comment passer commande ? (copie)",
			},
		});
	});

	it("should return success with duplicated id", async () => {
		const result = await duplicateFaqItem(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Question FAQ dupliquée avec succès", {
			id: VALID_CUID_2,
		});
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.faqItem.create.mockRejectedValue(new Error("DB crash"));
		const result = await duplicateFaqItem(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
