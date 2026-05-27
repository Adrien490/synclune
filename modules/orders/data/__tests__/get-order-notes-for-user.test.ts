/**
 * @regression ord-test-010 — anti-leak notes internes cote client
 *
 * Bug theorique : un developpeur cable les OrderNote dans /account/orders et
 * oublie de filtrer `isInternal=true`. Les notes admin (suspicion fraude,
 * blacklist, escalade legale) fuient alors au client.
 *
 * Garde-fou : `getOrderNotesForUser` filtre toujours `isInternal: false` dans
 * la query findMany ET verifie que la commande appartient bien au user
 * connecte. Ne PAS retirer ces deux verifications.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockRequireAuth, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
		orderNote: { findMany: vi.fn() },
	},
	mockRequireAuth: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAuth: mockRequireAuth,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		NOTES: (orderId: string) => `order-notes-${orderId}`,
	},
}));

import { getOrderNotesForUser } from "../get-order-notes-for-user";

// ============================================================================
// Factories
// ============================================================================

const VALID_ORDER_ID = "clzk2x8p40000abcd1234efgh";
const USER_ID = "user-client-1";
const OTHER_USER_ID = "user-other-1";

function makeNote(overrides: Record<string, unknown> = {}) {
	return {
		id: "note-1",
		content: "Note publique",
		authorId: "admin-1",
		authorName: "Admin",
		createdAt: new Date("2024-01-01T00:00:00Z"),
		...overrides,
	};
}

function setupAuthenticated(userId = USER_ID) {
	mockRequireAuth.mockResolvedValue({
		user: { id: userId, email: "client@example.com" },
	});
}

function setupOrderOwned(byUserId = USER_ID) {
	mockPrisma.order.findUnique.mockResolvedValue({ userId: byUserId });
}

// ============================================================================
// Tests
// ============================================================================

describe("getOrderNotesForUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupAuthenticated();
		setupOrderOwned();
		mockPrisma.orderNote.findMany.mockResolvedValue([makeNote()]);
	});

	// ------------------------------------------------------------------------
	// Auth
	// ------------------------------------------------------------------------

	it("returns auth error when requireAuth fails", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: "UNAUTHORIZED", message: "Non connecté" },
		});

		const result = await getOrderNotesForUser(VALID_ORDER_ID);

		expect(result).toEqual({ error: "Non connecté" });
		expect(mockPrisma.orderNote.findMany).not.toHaveBeenCalled();
	});

	// ------------------------------------------------------------------------
	// Validation
	// ------------------------------------------------------------------------

	it("returns error for invalid orderId (not CUID2)", async () => {
		const result = await getOrderNotesForUser("not-a-valid-cuid2");

		expect(result).toEqual({ error: "ID commande invalide" });
		expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
		expect(mockPrisma.orderNote.findMany).not.toHaveBeenCalled();
	});

	// ------------------------------------------------------------------------
	// Ownership
	// ------------------------------------------------------------------------

	it("returns 'introuvable' when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await getOrderNotesForUser(VALID_ORDER_ID);

		expect(result).toEqual({ error: "Commande introuvable" });
		expect(mockPrisma.orderNote.findMany).not.toHaveBeenCalled();
	});

	it("returns 'introuvable' when order belongs to another user (anti-IDOR)", async () => {
		setupOrderOwned(OTHER_USER_ID);

		const result = await getOrderNotesForUser(VALID_ORDER_ID);

		expect(result).toEqual({ error: "Commande introuvable" });
		expect(mockPrisma.orderNote.findMany).not.toHaveBeenCalled();
	});

	// ------------------------------------------------------------------------
	// Anti-leak isInternal — Garde-fou principal
	// ------------------------------------------------------------------------

	it("ALWAYS filters where isInternal=false in findMany (anti-leak garde-fou)", async () => {
		await getOrderNotesForUser(VALID_ORDER_ID);

		expect(mockPrisma.orderNote.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isInternal: false }),
			}),
		);
	});

	it("does NOT include any isInternal:true clause in findMany", async () => {
		await getOrderNotesForUser(VALID_ORDER_ID);

		const call = mockPrisma.orderNote.findMany.mock.calls[0]?.[0] as {
			where: { isInternal: boolean };
		};
		expect(call.where.isInternal).toBe(false);
	});

	// ------------------------------------------------------------------------
	// Cache + Where clause
	// ------------------------------------------------------------------------

	it("filters by orderId in the where clause", async () => {
		await getOrderNotesForUser(VALID_ORDER_ID);

		expect(mockPrisma.orderNote.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ orderId: VALID_ORDER_ID }),
			}),
		);
	});

	it("includes notDeleted filter (deletedAt: null) in where clause", async () => {
		await getOrderNotesForUser(VALID_ORDER_ID);

		expect(mockPrisma.orderNote.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("orders results by createdAt descending", async () => {
		await getOrderNotesForUser(VALID_ORDER_ID);

		expect(mockPrisma.orderNote.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { createdAt: "desc" },
			}),
		);
	});

	it("calls cacheLife with user profile and cacheTag with NOTES(orderId)", async () => {
		await getOrderNotesForUser(VALID_ORDER_ID);

		expect(mockCacheLife).toHaveBeenCalledWith("user");
		expect(mockCacheTag).toHaveBeenCalledWith(`order-notes-${VALID_ORDER_ID}`);
	});

	it("selects the expected public note fields (no isInternal exposed)", async () => {
		await getOrderNotesForUser(VALID_ORDER_ID);

		const call = mockPrisma.orderNote.findMany.mock.calls[0]?.[0] as {
			select: Record<string, boolean>;
		};
		// Public fields only
		expect(call.select).toEqual({
			id: true,
			content: true,
			authorId: true,
			authorName: true,
			createdAt: true,
		});
		// Garde-fou : ne pas exposer isInternal au client
		expect(call.select.isInternal).toBeUndefined();
	});

	// ------------------------------------------------------------------------
	// Success + errors
	// ------------------------------------------------------------------------

	it("returns notes array for owner", async () => {
		const notes = [makeNote(), makeNote({ id: "note-2", content: "Note 2" })];
		mockPrisma.orderNote.findMany.mockResolvedValue(notes);

		const result = await getOrderNotesForUser(VALID_ORDER_ID);

		expect(result).toEqual({ notes });
	});

	it("returns empty notes when none exist", async () => {
		mockPrisma.orderNote.findMany.mockResolvedValue([]);

		const result = await getOrderNotesForUser(VALID_ORDER_ID);

		expect(result).toEqual({ notes: [] });
	});

	it("returns generic error on DB exception", async () => {
		mockPrisma.orderNote.findMany.mockRejectedValue(new Error("DB error"));

		const result = await getOrderNotesForUser(VALID_ORDER_ID);

		expect(result).toEqual({ error: "Une erreur est survenue" });
	});

	it("returns generic error on requireAuth exception", async () => {
		mockRequireAuth.mockRejectedValue(new Error("Session lookup crashed"));

		const result = await getOrderNotesForUser(VALID_ORDER_ID);

		expect(result).toEqual({ error: "Une erreur est survenue" });
	});
});
