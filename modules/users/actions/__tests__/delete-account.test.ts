import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData, VALID_USER_ID } from "@/test/factories"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockAuth,
	mockHeaders,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn(), update: vi.fn() },
		order: { count: vi.fn() },
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockAuth: { api: { signOut: vi.fn() } },
	mockHeaders: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }))
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({ enforceRateLimitForCurrentUser: mockEnforceRateLimit }))
vi.mock("@/shared/lib/rate-limit-config", () => ({ USER_LIMITS: { DELETE_ACCOUNT: "user-delete-account" } }))
vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }))
vi.mock("next/headers", () => ({ headers: mockHeaders }))
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}))
vi.mock("../../schemas/user.schemas", () => ({ deleteAccountSchema: {} }))
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_CUSTOMERS_LIST: "admin-customers-list", ADMIN_BADGES: "admin-badges" },
}))
vi.mock("../../constants/cache", () => ({
	USERS_CACHE_TAGS: { CURRENT_USER: (id: string) => `current-user-${id}` },
}))

import { deleteAccount } from "../delete-account"

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ confirmation: "SUPPRIMER MON COMPTE" })

// ============================================================================
// TESTS
// ============================================================================

describe("deleteAccount", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockRequireAuth.mockResolvedValue({
			user: { id: VALID_USER_ID, email: "user@example.com", name: "User" },
		})
		mockValidateInput.mockReturnValue({ data: { confirmation: "SUPPRIMER MON COMPTE" } })
		mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: "ACTIVE" })
		mockPrisma.order.count.mockResolvedValue(0)
		mockPrisma.user.update.mockResolvedValue({})
		mockHeaders.mockResolvedValue(new Headers())
		mockAuth.api.signOut.mockResolvedValue({})

		mockSuccess.mockImplementation((msg: string) => ({ status: ActionStatus.SUCCESS, message: msg }))
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR, message: fallback,
		}))
	})

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: ActionStatus.ERROR, message: "Rate" } })
		const result = await deleteAccount(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return auth error when not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({ error: { status: ActionStatus.UNAUTHORIZED, message: "No" } })
		const result = await deleteAccount(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED)
	})

	it("should return validation error for wrong confirmation text", async () => {
		mockValidateInput.mockReturnValue({ error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" } })
		const result = await deleteAccount(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
	})

	it("should return error when deletion already pending (idempotence)", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" })
		const result = await deleteAccount(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("déjà en cours")
	})

	it("should return error when user has pending orders", async () => {
		mockPrisma.order.count.mockResolvedValue(2)
		const result = await deleteAccount(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("2 commande")
	})

	it("should set PENDING_DELETION status", async () => {
		await deleteAccount(undefined, validFormData)
		expect(mockPrisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_USER_ID },
				data: expect.objectContaining({ accountStatus: "PENDING_DELETION" }),
			})
		)
	})

	it("should sign out user after deletion request", async () => {
		await deleteAccount(undefined, validFormData)
		expect(mockAuth.api.signOut).toHaveBeenCalled()
	})

	it("should invalidate cache tags", async () => {
		await deleteAccount(undefined, validFormData)
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list")
	})

	it("should succeed with proper message", async () => {
		const result = await deleteAccount(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("30 jours")
	})

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.user.findUnique.mockRejectedValue(new Error("DB crash"))
		const result = await deleteAccount(undefined, validFormData)
		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
