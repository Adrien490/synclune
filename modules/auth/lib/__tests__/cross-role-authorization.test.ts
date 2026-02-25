/**
 * Cross-role authorization tests
 *
 * Verifies that:
 * - Non-authenticated users cannot access admin or user actions
 * - Regular users cannot access admin actions (privilege escalation prevention)
 * - Admin users can access admin actions
 * - Demoted admins (stale session) are rejected
 */
import { describe, it, expect, beforeEach, vi } from "vitest"

import { ActionStatus } from "@/shared/types/server-action"

// ============================================================================
// Mocks
// ============================================================================

const { mockGetSession, mockPrisma } = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockPrisma: {
		user: { findUnique: vi.fn() },
	},
}))

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}))

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}))

import { requireAuth, requireAdmin, requireAdminWithUser } from "../require-auth"

// ============================================================================
// Test Helpers
// ============================================================================

const regularUserSession = {
	user: {
		id: "user-123",
		email: "user@example.com",
		name: "Regular User",
		role: "USER",
	},
}

const adminUserSession = {
	user: {
		id: "admin-456",
		email: "admin@example.com",
		name: "Admin User",
		role: "ADMIN",
	},
}

const regularUserDb = {
	id: "user-123",
	email: "user@example.com",
	name: "Regular User",
	role: "USER",
	firstName: "Regular",
	lastName: "User",
	image: null,
	emailVerified: true,
	stripeCustomerId: null,
	deletedAt: null,
}

const adminUserDb = {
	id: "admin-456",
	email: "admin@example.com",
	name: "Admin User",
	role: "ADMIN",
	firstName: "Admin",
	lastName: "User",
	image: null,
	emailVerified: true,
	stripeCustomerId: null,
	deletedAt: null,
}

const demotedAdminDb = {
	...adminUserDb,
	role: "USER", // Admin demoted in DB but session still says ADMIN
}

// ============================================================================
// Tests
// ============================================================================

describe("Cross-role authorization", () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe("requireAuth - user-level access", () => {
		it("should reject unauthenticated requests", async () => {
			mockGetSession.mockResolvedValue(null)

			const result = await requireAuth()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED)
			}
		})

		it("should reject session without user id", async () => {
			mockGetSession.mockResolvedValue({ user: {} })

			const result = await requireAuth()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED)
			}
		})

		it("should reject soft-deleted user", async () => {
			mockGetSession.mockResolvedValue(regularUserSession)
			mockPrisma.user.findUnique.mockResolvedValue(null) // Not found (deleted)

			const result = await requireAuth()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED)
			}
		})

		it("should accept regular authenticated user", async () => {
			mockGetSession.mockResolvedValue(regularUserSession)
			mockPrisma.user.findUnique.mockResolvedValue(regularUserDb)

			const result = await requireAuth()
			expect("user" in result).toBe(true)
			if ("user" in result) {
				expect(result.user.id).toBe("user-123")
				expect(result.user.role).toBe("USER")
			}
		})

		it("should accept admin user through requireAuth", async () => {
			mockGetSession.mockResolvedValue(adminUserSession)
			mockPrisma.user.findUnique.mockResolvedValue(adminUserDb)

			const result = await requireAuth()
			expect("user" in result).toBe(true)
			if ("user" in result) {
				expect(result.user.role).toBe("ADMIN")
			}
		})
	})

	describe("requireAdmin - admin-only access", () => {
		it("should reject unauthenticated requests", async () => {
			mockGetSession.mockResolvedValue(null)

			const result = await requireAdmin()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.FORBIDDEN)
			}
		})

		it("should reject regular user trying to access admin", async () => {
			mockGetSession.mockResolvedValue(regularUserSession)

			const result = await requireAdmin()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.FORBIDDEN)
			}
		})

		it("should reject demoted admin (stale session attack)", async () => {
			// Session says ADMIN but DB says USER (demoted after login)
			mockGetSession.mockResolvedValue(adminUserSession)
			mockPrisma.user.findUnique.mockResolvedValue(demotedAdminDb)

			const result = await requireAdmin()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.FORBIDDEN)
			}
		})

		it("should reject deleted admin", async () => {
			mockGetSession.mockResolvedValue(adminUserSession)
			mockPrisma.user.findUnique.mockResolvedValue(null) // Deleted

			const result = await requireAdmin()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.FORBIDDEN)
			}
		})

		it("should accept valid admin user", async () => {
			mockGetSession.mockResolvedValue(adminUserSession)
			mockPrisma.user.findUnique.mockResolvedValue(adminUserDb)

			const result = await requireAdmin()
			expect("error" in result).toBe(false)
			expect("admin" in result).toBe(true)
		})
	})

	describe("requireAdminWithUser - admin access with user data", () => {
		it("should reject unauthenticated requests", async () => {
			mockGetSession.mockResolvedValue(null)

			const result = await requireAdminWithUser()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED)
			}
		})

		it("should reject regular user with FORBIDDEN", async () => {
			mockGetSession.mockResolvedValue(regularUserSession)
			mockPrisma.user.findUnique.mockResolvedValue(regularUserDb)

			const result = await requireAdminWithUser()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.FORBIDDEN)
			}
		})

		it("should reject demoted admin (privilege escalation prevention)", async () => {
			mockGetSession.mockResolvedValue(adminUserSession)
			mockPrisma.user.findUnique.mockResolvedValue(demotedAdminDb)

			const result = await requireAdminWithUser()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.FORBIDDEN)
			}
		})

		it("should accept valid admin and return user data", async () => {
			mockGetSession.mockResolvedValue(adminUserSession)
			mockPrisma.user.findUnique.mockResolvedValue(adminUserDb)

			const result = await requireAdminWithUser()
			expect("user" in result).toBe(true)
			if ("user" in result) {
				expect(result.user.id).toBe("admin-456")
				expect(result.user.email).toBe("admin@example.com")
				expect(result.user.role).toBe("ADMIN")
			}
		})
	})

	describe("Privilege escalation scenarios", () => {
		it("regular user session should be rejected by all admin guards", async () => {
			mockGetSession.mockResolvedValue(regularUserSession)
			mockPrisma.user.findUnique.mockResolvedValue(regularUserDb)

			const adminResult = await requireAdmin()
			expect("error" in adminResult).toBe(true)

			const adminWithUserResult = await requireAdminWithUser()
			expect("error" in adminWithUserResult).toBe(true)
		})

		it("tampered session with ADMIN role but USER in DB should be rejected", async () => {
			// Simulate tampered session claiming ADMIN role
			const tamperedSession = {
				user: {
					id: "user-123",
					email: "user@example.com",
					name: "Regular User",
					role: "ADMIN", // Tampered to claim admin
				},
			}

			mockGetSession.mockResolvedValue(tamperedSession)
			// DB returns the real USER role
			mockPrisma.user.findUnique.mockResolvedValue(regularUserDb)

			const result = await requireAdmin()
			expect("error" in result).toBe(true)
			if ("error" in result) {
				expect(result.error.status).toBe(ActionStatus.FORBIDDEN)
			}
		})

		it("no session should never pass any auth guard", async () => {
			mockGetSession.mockResolvedValue(null)

			const authResult = await requireAuth()
			expect("error" in authResult).toBe(true)

			const adminResult = await requireAdmin()
			expect("error" in adminResult).toBe(true)

			const adminWithUserResult = await requireAdminWithUser()
			expect("error" in adminWithUserResult).toBe(true)
		})
	})
})
