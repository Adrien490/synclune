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
	mockLogAudit,
	mockGetColorInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		color: {
			update: vi.fn((args: unknown) => args),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockLogAudit: vi.fn(),
	mockGetColorInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLOR_LIMITS: { REORDER: "color-reorder" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../schemas/color.schemas", () => ({ reorderColorsSchema: {} }));
vi.mock("../../constants/cache", () => ({
	getColorInvalidationTags: mockGetColorInvalidationTags,
}));

import { reorderColors } from "../reorder-colors";

// ============================================================================
// TESTS
// ============================================================================

const validItems = [
	{ id: "c1", position: 0 },
	{ id: "c2", position: 1 },
	{ id: "c3", position: 2 },
];

const validFormData = createMockFormData({ items: JSON.stringify(validItems) });

describe("reorderColors", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { items: validItems } });
		mockGetColorInvalidationTags.mockReturnValue(["colors-list", "admin-badges"]);
		mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

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

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await reorderColors(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await reorderColors(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns error for malformed JSON in items", async () => {
		const badFormData = createMockFormData({ items: "{not-json" });
		const result = await reorderColors(undefined, badFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalides");
	});

	it("returns validation error for invalid schema", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await reorderColors(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("calls prisma.color.update for each item inside a transaction", async () => {
		await reorderColors(undefined, validFormData);
		expect(mockPrisma.color.update).toHaveBeenCalledTimes(3);
		expect(mockPrisma.color.update).toHaveBeenCalledWith({
			where: { id: "c1" },
			data: { position: 0 },
		});
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("invalidates cache and writes audit log on success", async () => {
		const result = await reorderColors(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "color.reorder",
				targetType: "color",
				targetId: "batch",
				metadata: { count: 3 },
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await reorderColors(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
