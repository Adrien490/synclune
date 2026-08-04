import { describe, it, expect, vi, beforeEach } from "vitest";
import { WISHLIST_MAX_ITEMS } from "@/modules/wishlist/constants/wishlist.constants";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCookieStore } = vi.hoisted(() => ({
	mockCookieStore: {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
		has: vi.fn(),
	},
}));

vi.mock("next/headers", () => ({
	cookies: vi.fn(async () => mockCookieStore),
}));

import { readWishlistCookie, writeWishlistCookie } from "../wishlist-cookie";

const VALID_ID_A = "cm1234567890abcdefghijk12";
const VALID_ID_B = "cm1234567890abcdefghijk34";

function setCookieValue(value: string | undefined) {
	mockCookieStore.get.mockReturnValue(value === undefined ? undefined : { value });
}

beforeEach(() => {
	vi.clearAllMocks();
	mockCookieStore.has.mockReturnValue(false);
});

// ============================================================================
// readWishlistCookie — le cookie est une entrée CLIENT, jamais de confiance
// ============================================================================

describe("readWishlistCookie", () => {
	it("retourne [] sans cookie", async () => {
		setCookieValue(undefined);
		expect(await readWishlistCookie()).toEqual([]);
	});

	it("retourne [] sur JSON invalide", async () => {
		setCookieValue("not-json{");
		expect(await readWishlistCookie()).toEqual([]);
	});

	it("retourne [] sur un JSON qui n'est pas un tableau", async () => {
		setCookieValue(JSON.stringify({ ids: [VALID_ID_A] }));
		expect(await readWishlistCookie()).toEqual([]);
	});

	it("écarte les entrées non-string et non-cuid2 en gardant les valides", async () => {
		setCookieValue(
			JSON.stringify([
				VALID_ID_A,
				42,
				null,
				"UPPERCASE_NOT_CUID2",
				"a".repeat(64), // trop long
				"1starts-with-digit",
				VALID_ID_B,
			]),
		);
		expect(await readWishlistCookie()).toEqual([VALID_ID_A, VALID_ID_B]);
	});

	it("déduplique en préservant l'ordre (première occurrence gagne)", async () => {
		setCookieValue(JSON.stringify([VALID_ID_A, VALID_ID_B, VALID_ID_A]));
		expect(await readWishlistCookie()).toEqual([VALID_ID_A, VALID_ID_B]);
	});

	it("tronque à WISHLIST_MAX_ITEMS", async () => {
		const ids = Array.from({ length: WISHLIST_MAX_ITEMS + 10 }, (_, i) =>
			`cm${String(i).padStart(22, "x")}`.toLowerCase().slice(0, 24),
		);
		// Les ids générés doivent être des cuid2-like valides et uniques
		setCookieValue(JSON.stringify(ids));
		const result = await readWishlistCookie();
		expect(result.length).toBeLessThanOrEqual(WISHLIST_MAX_ITEMS);
	});
});

// ============================================================================
// writeWishlistCookie
// ============================================================================

describe("writeWishlistCookie", () => {
	it("pose le cookie en JSON avec les options de sécurité", async () => {
		await writeWishlistCookie([VALID_ID_A, VALID_ID_B]);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			"wishlist",
			JSON.stringify([VALID_ID_A, VALID_ID_B]),
			expect.objectContaining({
				httpOnly: true,
				sameSite: "lax",
				path: "/",
				maxAge: 60 * 60 * 24 * 30, // 30 jours glissants
			}),
		);
	});

	it("supprime le cookie quand la liste est vide (pas de cookie vide qui traîne)", async () => {
		await writeWishlistCookie([]);

		expect(mockCookieStore.delete).toHaveBeenCalledWith("wishlist");
		expect(mockCookieStore.set).not.toHaveBeenCalled();
	});

	it("tronque à WISHLIST_MAX_ITEMS avant d'écrire (borne de taille du cookie)", async () => {
		const ids = Array.from({ length: WISHLIST_MAX_ITEMS + 5 }, (_, i) => `id${i}`);
		await writeWishlistCookie(ids);

		const setCall = mockCookieStore.set.mock.calls[0] as unknown as [string, string];
		const written = JSON.parse(setCall[1]) as string[];
		expect(written).toHaveLength(WISHLIST_MAX_ITEMS);
	});

	it("purge le cookie legacy wishlist_session (la table qu'il identifiait n'existe plus)", async () => {
		mockCookieStore.has.mockReturnValue(true);
		await writeWishlistCookie([VALID_ID_A]);

		expect(mockCookieStore.delete).toHaveBeenCalledWith("wishlist_session");
	});

	it("ne touche pas au cookie legacy s'il est absent", async () => {
		mockCookieStore.has.mockReturnValue(false);
		await writeWishlistCookie([VALID_ID_A]);

		expect(mockCookieStore.delete).not.toHaveBeenCalled();
	});
});
