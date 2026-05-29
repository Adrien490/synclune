import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as ServerActionModule from "@/shared/types/server-action";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockGetSession, mockPrisma } = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockPrisma: {
		user: {
			findUnique: vi.fn(),
		},
	},
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/types/server-action", async (importOriginal) => {
	const original = await importOriginal<typeof ServerActionModule>();
	return original;
});

import {
	requireAuth,
	requireAdmin,
	requireAdminWithUser,
	requireAuthAllowPendingDeletion,
	requireActiveAccountIfAuthenticated,
} from "../require-auth";
import { ActionStatus } from "@/shared/types/server-action";
import { AccountStatus } from "@/app/generated/prisma/client";

// ============================================================================
// Fixtures
// ============================================================================

function makeUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-1",
		email: "user@example.com",
		name: "Marie Dupont",
		role: "USER",
		image: null,
		firstName: "Marie",
		lastName: "Dupont",
		emailVerified: true,
		stripeCustomerId: "cus_123",
		...overrides,
	};
}

function makeSession(overrides: Record<string, unknown> = {}) {
	return {
		user: {
			id: "user-1",
			role: "USER",
			...overrides,
		},
	};
}

// ============================================================================
// requireAuth
// ============================================================================

describe("requireAuth", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return UNAUTHORIZED when no session", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await requireAuth();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED);
		}
	});

	it("should return UNAUTHORIZED when session has no user.id", async () => {
		mockGetSession.mockResolvedValue({ user: {} });

		const result = await requireAuth();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED);
		}
	});

	it("should return UNAUTHORIZED when user not found in DB (deleted)", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await requireAuth();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED);
		}
	});

	it("should return user for a valid authenticated user", async () => {
		const user = makeUser();
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(user);

		const result = await requireAuth();

		expect("user" in result).toBe(true);
		if ("user" in result) {
			expect(result.user).toEqual(user);
		}
	});

	it("should query with notDeleted filter", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());

		await requireAuth();

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	/**
	 * @regression AUTH-ADMIN-001 — `fetchUserForAuth` must filter by suspendedAt + accountStatus = ACTIVE
	 * to block suspended / PENDING_DELETION / INACTIVE / ANONYMIZED users.
	 */
	it("(AUTH-ADMIN-001) filters by suspendedAt = null AND accountStatus = ACTIVE", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());

		await requireAuth();

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					deletedAt: null,
					suspendedAt: null,
					accountStatus: { in: [AccountStatus.ACTIVE] },
				}),
			}),
		);
	});

	it("(AUTH-ADMIN-001) returns UNAUTHORIZED when DB filter rejects suspended/blocked user", async () => {
		// DB returns null because suspendedAt/accountStatus filter excludes the row,
		// even though the session cookie is valid.
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await requireAuth();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED);
		}
	});
});

// ============================================================================
// requireAuthAllowPendingDeletion (AUTH-ADMIN-001 / AUTH-ADMIN-004)
// ============================================================================

describe("requireAuthAllowPendingDeletion", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("uses accountStatus filter that allows PENDING_DELETION", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());

		await requireAuthAllowPendingDeletion();

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					deletedAt: null,
					suspendedAt: null,
					accountStatus: { in: [AccountStatus.ACTIVE, AccountStatus.PENDING_DELETION] },
				}),
			}),
		);
	});

	it("returns UNAUTHORIZED when no session", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await requireAuthAllowPendingDeletion();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED);
		}
	});

	it("returns user for ACTIVE account", async () => {
		const user = makeUser();
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(user);

		const result = await requireAuthAllowPendingDeletion();

		expect("user" in result).toBe(true);
	});

	it("returns user when DB row matches PENDING_DELETION filter (cancelAccountDeletion flow)", async () => {
		const user = makeUser();
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(user);

		const result = await requireAuthAllowPendingDeletion();

		expect("user" in result).toBe(true);
		if ("user" in result) {
			expect(result.user.id).toBe(user.id);
		}
	});
});

// ============================================================================
// requireActiveAccountIfAuthenticated (AUTHZ-1)
// ============================================================================

describe("requireActiveAccountIfAuthenticated", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("allows guests (no session) without hitting the DB", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await requireActiveAccountIfAuthenticated();

		expect(result).toEqual({ ok: true });
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("allows guests (session without user.id)", async () => {
		mockGetSession.mockResolvedValue({ user: {} });

		const result = await requireActiveAccountIfAuthenticated();

		expect(result).toEqual({ ok: true });
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("allows an authenticated ACTIVE account", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());

		const result = await requireActiveAccountIfAuthenticated();

		expect(result).toEqual({ ok: true });
	});

	it("filters by suspendedAt = null AND accountStatus = ACTIVE", async () => {
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());

		await requireActiveAccountIfAuthenticated();

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					deletedAt: null,
					suspendedAt: null,
					accountStatus: { in: [AccountStatus.ACTIVE] },
				}),
			}),
		);
	});

	it("returns FORBIDDEN when the authenticated account is not ACTIVE (suspended/INACTIVE/PENDING_DELETION)", async () => {
		// DB returns null because the active-only filter excludes the row,
		// even though the session cookie is still valid (cookie-cache window).
		mockGetSession.mockResolvedValue(makeSession());
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await requireActiveAccountIfAuthenticated();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.FORBIDDEN);
		}
	});
});

// ============================================================================
// requireAdmin
// ============================================================================

describe("requireAdmin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return FORBIDDEN when no session", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await requireAdmin();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.FORBIDDEN);
		}
	});

	it("should return FORBIDDEN when role is not ADMIN", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "USER", id: "user-1" }));

		const result = await requireAdmin();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.FORBIDDEN);
		}
	});

	it("should return FORBIDDEN when admin in session but demoted in DB", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "ADMIN", id: "user-1" }));
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));

		const result = await requireAdmin();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.FORBIDDEN);
		}
	});

	it("should return FORBIDDEN when admin in session but deleted in DB", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "ADMIN", id: "user-1" }));
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await requireAdmin();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.FORBIDDEN);
		}
	});

	it("should return admin: true for a valid admin", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "ADMIN", id: "admin-1" }));
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ id: "admin-1", role: "ADMIN" }));

		const result = await requireAdmin();

		expect(result).toEqual({ admin: true });
	});
});

// ============================================================================
// requireAdminWithUser
// ============================================================================

describe("requireAdminWithUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return UNAUTHORIZED when no session", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await requireAdminWithUser();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED);
		}
	});

	it("should return FORBIDDEN when role is not ADMIN", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "USER", id: "user-1" }));

		const result = await requireAdminWithUser();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.FORBIDDEN);
		}
	});

	it("should return UNAUTHORIZED when user not found in DB", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "ADMIN", id: "admin-1" }));
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await requireAdminWithUser();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.UNAUTHORIZED);
		}
	});

	it("should return FORBIDDEN when admin in session but demoted in DB", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "ADMIN", id: "admin-1" }));
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ id: "admin-1", role: "USER" }));

		const result = await requireAdminWithUser();

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.FORBIDDEN);
		}
	});

	it("should return user for a valid admin", async () => {
		const admin = makeUser({ id: "admin-1", role: "ADMIN" });
		mockGetSession.mockResolvedValue(makeSession({ role: "ADMIN", id: "admin-1" }));
		mockPrisma.user.findUnique.mockResolvedValue(admin);

		const result = await requireAdminWithUser();

		expect("user" in result).toBe(true);
		if ("user" in result) {
			expect(result.user).toEqual(admin);
		}
	});
});
