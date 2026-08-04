/**
 * Session INVITÉ — ex-« session panier ».
 *
 * Depuis le passage du panier en cookie (2026-08-04), ce cookie ne pointe plus
 * vers aucune ligne en base. Il reste néanmoins nécessaire : il porte la garde
 * d'ownership du PaymentIntent (CHECKOUT-IDOR-001, via `metadata.guestSessionId`)
 * et l'identité de rate limiting du visiteur. D'où la conservation du NOM
 * `cart_session` — le renommer invaliderait la garde de tout PI créé avant le
 * déploiement.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { getGuestSessionId, getOrCreateGuestSessionId } from "../guest-session";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function setCookieValue(value: string | undefined) {
	mockCookieStore.get.mockReturnValue(value === undefined ? undefined : { value });
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getGuestSessionId", () => {
	it("retourne null sans cookie", async () => {
		setCookieValue(undefined);
		expect(await getGuestSessionId()).toBeNull();
	});

	it("retourne l'identifiant sur un UUID v4 valide", async () => {
		setCookieValue(VALID_UUID);
		expect(await getGuestSessionId()).toBe(VALID_UUID);
	});

	/**
	 * Le cookie est une entrée client : une valeur forgée ne doit jamais devenir
	 * un `guestSessionId` accepté par la garde d'ownership du PaymentIntent.
	 */
	it.each([
		["chaîne vide", ""],
		["non-UUID", "pas-un-uuid"],
		["UUID v1 (mauvaise version)", "550e8400-e29b-11d4-a716-446655440000"],
		["variante invalide", "550e8400-e29b-41d4-c716-446655440000"],
		["tronqué", "550e8400-e29b-41d4-a716"],
		["injection SQL", "'; DROP TABLE users; --"],
	])("retourne null sur %s", async (_label, value) => {
		setCookieValue(value);
		expect(await getGuestSessionId()).toBeNull();
	});
});

describe("getOrCreateGuestSessionId", () => {
	it("crée un UUID v4 et pose le cookie quand il n'existe pas", async () => {
		setCookieValue(undefined);

		const id = await getOrCreateGuestSessionId();

		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
		expect(mockCookieStore.set).toHaveBeenCalledWith("cart_session", id, expect.any(Object));
	});

	it("réutilise un identifiant existant", async () => {
		setCookieValue(VALID_UUID);
		expect(await getOrCreateGuestSessionId()).toBe(VALID_UUID);
	});

	/** Expiration glissante : sans re-pose, un invité actif > 7 j perdrait la garde. */
	it("re-pose le cookie existant pour rafraîchir son maxAge", async () => {
		setCookieValue(VALID_UUID);

		await getOrCreateGuestSessionId();

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			"cart_session",
			VALID_UUID,
			expect.objectContaining({ maxAge: 60 * 60 * 24 * 7 }),
		);
	});

	it("remplace un identifiant invalide par un neuf", async () => {
		setCookieValue("pas-un-uuid");

		const id = await getOrCreateGuestSessionId();

		expect(id).not.toBe("pas-un-uuid");
		expect(mockCookieStore.set).toHaveBeenCalledWith("cart_session", id, expect.any(Object));
	});

	it("pose les attributs de sécurité", async () => {
		setCookieValue(undefined);

		await getOrCreateGuestSessionId();

		expect(mockCookieStore.set.mock.calls[0]![2]).toMatchObject({
			httpOnly: true,
			sameSite: "lax",
			path: "/",
		});
	});
});
