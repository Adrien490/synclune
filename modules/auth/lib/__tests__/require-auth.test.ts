import { describe, it, expect, vi, beforeEach } from "vitest";

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
	const original = await importOriginal<typeof import("@/shared/types/server-action")>();
	return original;
});

import { requireAuth, requireAdmin, requireAdminWithUser } from "../require-auth";
import { ActionStatus } from "@/shared/types/server-action";

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
