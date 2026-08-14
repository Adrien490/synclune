/**
 * @regression search-address-rpc-argument-2026-08-07
 *
 * Les deux actions de `search-address.ts` sont des endpoints RPC publics
 * (`"use server"`), donc appelables avec **n'importe quel** argument : le type
 * TypeScript du paramètre est effacé à l'exécution.
 *
 * Le fichier documentait pourtant un repli « liste vide + `error: true` » qui ne
 * s'exécutait jamais sur un argument non-objet. La séquence exacte :
 *
 *   1. `searchAddressSchema.parse(params)` lève sa `ZodError` — attendu ;
 *   2. le `catch` construit son repli avec `params.text` / `params.maximumResponses` ;
 *   3. sur `null` / `undefined` / `"x"`, cette lecture lève un `TypeError`
 *      **depuis le catch**, donc hors de toute garde.
 *
 * L'appelant recevait une erreur non rattrapée là où le contrat annonce une liste
 * vide. Le repli de rate limit avait le même défaut, une ligne avant le `try`.
 *
 * Correctif : `params: unknown` + `safeParse` EN TÊTE, et tous les replis bâtis
 * sur la valeur parsée — plus jamais sur l'argument brut.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEnforceRateLimitForCurrentUser, mockFetchAddresses, mockFetchGeoapifyAddresses } =
	vi.hoisted(() => ({
		mockEnforceRateLimitForCurrentUser: vi.fn(),
		mockFetchAddresses: vi.fn(),
		mockFetchGeoapifyAddresses: vi.fn(),
	}));

vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimitForCurrentUser,
}));

vi.mock("@/modules/addresses/data/fetch-addresses", () => ({
	fetchAddresses: mockFetchAddresses,
}));

vi.mock("@/modules/addresses/data/fetch-geoapify-addresses", () => ({
	fetchGeoapifyAddresses: mockFetchGeoapifyAddresses,
}));

import { searchAddress, searchAddressForCheckout } from "../search-address";

/** Arguments qu'un appel RPC direct peut produire et que le type ne bloque pas. */
const HOSTILE_ARGUMENTS: Array<[label: string, value: unknown]> = [
	["null", null],
	["undefined", undefined],
	["une chaîne", "12 rue de la Paix"],
	["un nombre", 42],
	["un tableau", ["12 rue de la Paix"]],
	["un objet vide", {}],
	["un objet sans `text`", { maximumResponses: 5 }],
	["un `text` non-string", { text: { toString: () => "x" } }],
];

beforeEach(() => {
	vi.clearAllMocks();
	mockEnforceRateLimitForCurrentUser.mockResolvedValue({ success: true });
});

describe("@regression search-address-rpc-argument — searchAddress", () => {
	it.each(HOSTILE_ARGUMENTS)("rend le repli sans throw sur %s", async (_label, value) => {
		await expect(searchAddress(value)).resolves.toEqual({
			addresses: [],
			query: "",
			limit: expect.any(Number),
			error: true,
		});
	});

	it("n'atteint jamais l'API en amont sur un argument invalide", async () => {
		await searchAddress(null);
		expect(mockFetchAddresses).not.toHaveBeenCalled();
	});

	it("court-circuite AVANT le rate limit — un payload malformé n'est pas une recherche", async () => {
		// Le parse précède `enforceRateLimitForCurrentUser` : un appelant qui envoie
		// n'importe quoi ne consomme pas le quota d'un visiteur légitime derrière la
		// même IP.
		await searchAddress(null);
		expect(mockEnforceRateLimitForCurrentUser).not.toHaveBeenCalled();
	});

	it("rend le repli sur la valeur PARSÉE quand le rate limit bloque", async () => {
		mockEnforceRateLimitForCurrentUser.mockResolvedValue({
			error: { status: "ERROR", message: "Trop de requêtes" },
		});

		const result = await searchAddress({ text: "Nantes", maximumResponses: 3 });

		expect(result).toEqual({ addresses: [], query: "Nantes", limit: 3, error: true });
		expect(mockFetchAddresses).not.toHaveBeenCalled();
	});
});

describe("@regression search-address-rpc-argument — searchAddressForCheckout", () => {
	it.each(HOSTILE_ARGUMENTS)("rend le repli sans throw sur %s", async (_label, value) => {
		await expect(searchAddressForCheckout(value)).resolves.toEqual({
			addresses: [],
			query: "",
			limit: expect.any(Number),
			error: true,
		});
	});

	it("refuse un pays hors zone de livraison plutôt que d'appeler Geoapify", async () => {
		// `geoapifySearchSchema` ne bornait `countryCode` qu'à `length(2)` : n'importe
		// quel code ISO atteignait une API facturée à l'appel, depuis un endpoint public.
		const result = await searchAddressForCheckout({ text: "Tokyo", country: "JP" });

		expect(result.error).toBe(true);
		expect(mockFetchGeoapifyAddresses).not.toHaveBeenCalled();
		expect(mockFetchAddresses).not.toHaveBeenCalled();
	});

	it("route la France vers l'API BAN", async () => {
		mockFetchAddresses.mockResolvedValue({ addresses: [], query: "Nantes", limit: 5 });

		await searchAddressForCheckout({ text: "Nantes", country: "FR" });

		expect(mockFetchAddresses).toHaveBeenCalledTimes(1);
		expect(mockFetchGeoapifyAddresses).not.toHaveBeenCalled();
	});

	it("route un autre pays livré vers Geoapify", async () => {
		mockFetchGeoapifyAddresses.mockResolvedValue({ addresses: [], query: "Berlin", limit: 5 });

		await searchAddressForCheckout({ text: "Berlin", country: "DE" });

		expect(mockFetchGeoapifyAddresses).toHaveBeenCalledWith(
			expect.objectContaining({ countryCode: "DE" }),
		);
		expect(mockFetchAddresses).not.toHaveBeenCalled();
	});
});
