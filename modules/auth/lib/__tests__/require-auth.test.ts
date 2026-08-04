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
	requireAdminApiRoute,
	requireAdminWithUser,
	isVerifiedAdmin,
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
	 * to block suspended / INACTIVE / ANONYMIZED users.
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
// isVerifiedAdmin — branche de privilège OPTIONNELLE (booléenne, ne bloque pas)
// ============================================================================
//
// Garde `isAdmin()` (donc toute la couche `data/` admin) et le bypass de la
// garde « boutique fermée » au checkout. Il n'avait aucun test direct jusqu'à
// l'audit « Admin role & re-check DB » du 2026-07-31.

describe("isVerifiedAdmin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns false WITHOUT querying the DB when the cookie does not claim ADMIN", async () => {
		// Le court-circuit est ce qui rend le helper gratuit pour les invités et la
		// vitrine : le perdre ajouterait une requête par rendu public.
		const result = await isVerifiedAdmin(makeSession({ role: "USER" }));

		expect(result).toBe(false);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("returns false without querying the DB for a guest (no session)", async () => {
		expect(await isVerifiedAdmin(null)).toBe(false);
		expect(await isVerifiedAdmin(undefined)).toBe(false);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("returns false when the cookie claims ADMIN but the DB says USER (demoted)", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));

		const result = await isVerifiedAdmin(makeSession({ role: "ADMIN" }));

		expect(result).toBe(false);
	});

	it("returns false when the account is no longer ACTIVE (suspended → row filtered out)", async () => {
		// `fetchUserForAuth` filtre suspendedAt/accountStatus DANS le where : une
		// ligne suspendue ne remonte pas, même avec role=ADMIN.
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await isVerifiedAdmin(makeSession({ role: "ADMIN" }));

		expect(result).toBe(false);
	});

	it("filters deletedAt AND suspendedAt AND accountStatus, not just the role", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));

		await isVerifiedAdmin(makeSession({ role: "ADMIN" }));

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

	it("returns true when the DB confirms an ACTIVE admin", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));

		expect(await isVerifiedAdmin(makeSession({ role: "ADMIN" }))).toBe(true);
	});
});

// ============================================================================
// requireAdminApiRoute — variante route handler (renvoie une Response HTTP)
// ============================================================================

describe("requireAdminApiRoute", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 (not 403) when there is no session at all", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await requireAdminApiRoute();

		expect("response" in result).toBe(true);
		if ("response" in result) expect(result.response.status).toBe(401);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("returns 403 when the session exists but does not claim ADMIN", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "USER" }));

		const result = await requireAdminApiRoute();

		expect("response" in result).toBe(true);
		if ("response" in result) expect(result.response.status).toBe(403);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("returns 403 when the cookie claims ADMIN but the DB says USER (stale session)", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "ADMIN" }));
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));

		const result = await requireAdminApiRoute();

		expect("response" in result).toBe(true);
		if ("response" in result) expect(result.response.status).toBe(403);
	});

	it("returns 403 when the account is no longer ACTIVE (suspended → row filtered out)", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "ADMIN" }));
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await requireAdminApiRoute();

		expect("response" in result).toBe(true);
		if ("response" in result) expect(result.response.status).toBe(403);
	});

	it("returns the user when the DB confirms an ACTIVE admin", async () => {
		mockGetSession.mockResolvedValue(makeSession({ role: "ADMIN" }));
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));

		const result = await requireAdminApiRoute();

		expect("user" in result).toBe(true);
		if ("user" in result) expect(result.user.role).toBe("ADMIN");
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

	it("returns FORBIDDEN when the authenticated account is not ACTIVE (suspended/INACTIVE)", async () => {
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
