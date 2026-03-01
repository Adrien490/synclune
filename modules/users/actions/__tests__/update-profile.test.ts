import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSafeFormGet,
	mockSuccess,
	mockHandleActionError,
	mockUpdateTag,
	mockSanitizeText,
	mockGetCurrentUserInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { update: vi.fn() },
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSafeFormGet: vi.fn(),
	mockSuccess: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockGetCurrentUserInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAuth: mockRequireAuth,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	USER_LIMITS: { UPDATE_PROFILE: "update_profile" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	safeFormGet: mockSafeFormGet,
	success: mockSuccess,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));
vi.mock("../../schemas/user.schemas", () => ({
	updateProfileSchema: {},
}));
vi.mock("../../constants/cache", () => ({
	getCurrentUserInvalidationTags: mockGetCurrentUserInvalidationTags,
}));

import { updateProfile } from "../update-profile";

// ============================================================================
// TESTS
// ============================================================================

describe("updateProfile", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeFormGet.mockImplementation((_fd: FormData, key: string) =>
			key === "name" ? "Marie Dupont" : null,
		);
		mockValidateInput.mockReturnValue({ data: { name: "Marie Dupont" } });
		mockPrisma.user.update.mockResolvedValue({});
		mockSanitizeText.mockImplementation((text: string) => text);
		mockGetCurrentUserInvalidationTags.mockReturnValue(["user-current"]);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns error when not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non connecté" },
		});

		const result = await updateProfile(undefined, createMockFormData({ name: "Marie" }));

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});

		const result = await updateProfile(undefined, createMockFormData({ name: "Marie" }));

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Nom requis" },
		});

		const result = await updateProfile(undefined, createMockFormData({ name: "" }));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("updates user name with sanitized input", async () => {
		mockSanitizeText.mockReturnValue("Marie Sanitized");

		await updateProfile(undefined, createMockFormData({ name: "Marie <script>" }));

		expect(mockSanitizeText).toHaveBeenCalledWith("Marie Dupont");
		expect(mockPrisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_USER_ID },
				data: { name: "Marie Sanitized" },
			}),
		);
	});

	it("invalidates current user cache tags after update", async () => {
		mockGetCurrentUserInvalidationTags.mockReturnValue(["user-current", "session-user"]);

		await updateProfile(undefined, createMockFormData({ name: "Marie" }));

		expect(mockGetCurrentUserInvalidationTags).toHaveBeenCalledWith(VALID_USER_ID);
		expect(mockUpdateTag).toHaveBeenCalledWith("user-current");
		expect(mockUpdateTag).toHaveBeenCalledWith("session-user");
	});

	it("returns success message on update", async () => {
		const result = await updateProfile(undefined, createMockFormData({ name: "Marie" }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Profil mis à jour avec succès");
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.user.update.mockRejectedValue(new Error("DB crash"));

		const result = await updateProfile(undefined, createMockFormData({ name: "Marie" }));

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la mise à jour du profil",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
