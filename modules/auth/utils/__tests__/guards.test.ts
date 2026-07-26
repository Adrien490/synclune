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

import { isAdmin } from "../guards";
import { AccountStatus } from "@/app/generated/prisma/client";

const ADMIN_SESSION = { user: { id: "user_1", role: "ADMIN" } };

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// isAdmin — re-vérification DB obligatoire (cookieCache Better Auth ~5 min)
// ============================================================================

describe("isAdmin", () => {
	it("returns true when the session claims ADMIN and the DB confirms it", async () => {
		mockGetSession.mockResolvedValue(ADMIN_SESSION);
		mockPrisma.user.findUnique.mockResolvedValue({ id: "user_1", role: "ADMIN" });

		expect(await isAdmin()).toBe(true);
		expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
	});

	it("re-verifies the role against the DB with the strict account filter", async () => {
		mockGetSession.mockResolvedValue(ADMIN_SESSION);
		mockPrisma.user.findUnique.mockResolvedValue({ id: "user_1", role: "ADMIN" });

		await isAdmin();

		expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: "user_1",
					deletedAt: null,
					suspendedAt: null,
					accountStatus: { in: [AccountStatus.ACTIVE] },
				}),
			}),
		);
	});

	// Le coeur du finding : cookie stale après retrogradation ADMIN -> USER.
	it("returns false when the session claims ADMIN but the DB says USER (demoted)", async () => {
		mockGetSession.mockResolvedValue(ADMIN_SESSION);
		mockPrisma.user.findUnique.mockResolvedValue({ id: "user_1", role: "USER" });

		expect(await isAdmin()).toBe(false);
	});

	// Compte suspendu / INACTIVE / PENDING_DELETION / ANONYMIZED / soft-deleted :
	// le filtre de fetchUserForAuth ne renvoie aucune ligne.
	it("returns false when the admin account is no longer active in DB", async () => {
		mockGetSession.mockResolvedValue(ADMIN_SESSION);
		mockPrisma.user.findUnique.mockResolvedValue(null);

		expect(await isAdmin()).toBe(false);
	});

	it("returns false when the session has no user id", async () => {
		mockGetSession.mockResolvedValue({ user: { role: "ADMIN" } });

		expect(await isAdmin()).toBe(false);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("returns false without querying the DB when the session role is USER", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user_1", role: "USER" } });

		expect(await isAdmin()).toBe(false);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("returns false without querying the DB when there is no session", async () => {
		mockGetSession.mockResolvedValue(null);

		expect(await isAdmin()).toBe(false);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("fails closed when getSession throws", async () => {
		mockGetSession.mockRejectedValue(new Error("auth error"));

		expect(await isAdmin()).toBe(false);
	});

	it("fails closed when the DB re-check throws", async () => {
		mockGetSession.mockResolvedValue(ADMIN_SESSION);
		mockPrisma.user.findUnique.mockRejectedValue(new Error("db down"));

		expect(await isAdmin()).toBe(false);
	});
});
