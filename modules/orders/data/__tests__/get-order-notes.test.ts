import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockRequireAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		orderNote: { findMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
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

// Must be imported after mocks
import { getOrderNotes } from "../get-order-notes";

// ============================================================================
// Factories
// ============================================================================

// Valid CUID2 strings for tests
const VALID_ORDER_ID = "clzk2x8p40000abcd1234efgh";
const VALID_ORDER_ID_2 = "clzk2x8p40000abcd1234ijkl";
const VALID_ORDER_ID_3 = "clzk2x8p40000abcd1234mnop";

function makeNote(overrides: Record<string, unknown> = {}) {
	return {
		id: "note-1",
		content: "Test note content",
		authorId: "admin-1",
		authorName: "Admin User",
		createdAt: new Date("2024-01-01T00:00:00Z"),
		...overrides,
	};
}

function setupAdminSuccess() {
	mockRequireAdmin.mockResolvedValue({ admin: true });
	mockPrisma.orderNote.findMany.mockResolvedValue([makeNote()]);
}

function setupAdminFailure() {
	mockRequireAdmin.mockResolvedValue({
		error: {
			status: "FORBIDDEN",
			message: "Accès non autorisé. Droits administrateur requis.",
		},
	});
}

// ============================================================================
// Tests: getOrderNotes
// ============================================================================

describe("getOrderNotes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupAdminSuccess();
	});

	it("returns error object when requireAdmin fails", async () => {
		setupAdminFailure();

		const result = await getOrderNotes(VALID_ORDER_ID);

		expect(result).toHaveProperty("error");
		expect(mockPrisma.orderNote.findMany).not.toHaveBeenCalled();
	});

	it("returns the error message from requireAdmin on auth failure", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: {
				status: "FORBIDDEN",
				message: "Accès non autorisé. Droits administrateur requis.",
			},
		});

		const result = await getOrderNotes(VALID_ORDER_ID);

		expect(result).toEqual({
			error: "Accès non autorisé. Droits administrateur requis.",
		});
	});

	it("returns error for invalid orderId (not CUID2)", async () => {
		const result = await getOrderNotes("not-a-valid-cuid2");

		expect(result).toEqual({ error: "ID commande invalide" });
		expect(mockPrisma.orderNote.findMany).not.toHaveBeenCalled();
	});

	it("returns notes array for admin", async () => {
		const notes = [makeNote(), makeNote({ id: "note-2", content: "Second note" })];
		mockPrisma.orderNote.findMany.mockResolvedValue(notes);

		const result = await getOrderNotes(VALID_ORDER_ID);

		expect(result).toEqual({ notes });
	});

	it("returns empty notes array when no notes exist", async () => {
		mockPrisma.orderNote.findMany.mockResolvedValue([]);

		const result = await getOrderNotes(VALID_ORDER_ID);

		expect(result).toEqual({ notes: [] });
	});

	it("returns generic error message on unexpected exception", async () => {
		mockRequireAdmin.mockRejectedValue(new Error("Unexpected failure"));

		const result = await getOrderNotes(VALID_ORDER_ID);

		expect(result).toEqual({ error: "Une erreur est survenue" });
	});

	it("returns generic error when DB throws", async () => {
		mockPrisma.orderNote.findMany.mockRejectedValue(new Error("DB error"));

		const result = await getOrderNotes(VALID_ORDER_ID);

		expect(result).toEqual({ error: "Une erreur est survenue" });
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getOrderNotes(VALID_ORDER_ID);

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with NOTES tag for the given orderId", async () => {
		await getOrderNotes(VALID_ORDER_ID_2);

		expect(mockCacheTag).toHaveBeenCalledWith(`order-notes-${VALID_ORDER_ID_2}`);
	});

	it("uses a different cache tag per orderId", async () => {
		await getOrderNotes(VALID_ORDER_ID_3);

		expect(mockCacheTag).toHaveBeenCalledWith(`order-notes-${VALID_ORDER_ID_3}`);
	});

	it("filters by orderId in the where clause", async () => {
		await getOrderNotes(VALID_ORDER_ID);

		expect(mockPrisma.orderNote.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ orderId: VALID_ORDER_ID }),
			}),
		);
	});

	it("includes notDeleted filter (deletedAt: null) in where clause", async () => {
		await getOrderNotes(VALID_ORDER_ID);

		expect(mockPrisma.orderNote.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("orders results by createdAt descending", async () => {
		await getOrderNotes(VALID_ORDER_ID);

		expect(mockPrisma.orderNote.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { createdAt: "desc" },
			}),
		);
	});

	it("selects the expected note fields", async () => {
		await getOrderNotes(VALID_ORDER_ID);

		expect(mockPrisma.orderNote.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					content: true,
					authorId: true,
					authorName: true,
					createdAt: true,
				},
			}),
		);
	});
});
