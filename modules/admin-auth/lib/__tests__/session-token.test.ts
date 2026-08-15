import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "../session-token";

const SECRET = "test-secret-at-least-32-characters-long!";
const NOW = 1_700_000_000_000;

describe("signSessionToken / verifySessionToken", () => {
	it("accepte un jeton signé non expiré", () => {
		const token = signSessionToken(NOW + 1000, SECRET);
		expect(verifySessionToken(token, SECRET, NOW)).toBe(true);
	});

	it("refuse un jeton expiré", () => {
		const token = signSessionToken(NOW - 1, SECRET);
		expect(verifySessionToken(token, SECRET, NOW)).toBe(false);
	});

	it("refuse un jeton dont l'expiry vaut exactement maintenant", () => {
		const token = signSessionToken(NOW, SECRET);
		expect(verifySessionToken(token, SECRET, NOW)).toBe(false);
	});

	it("refuse un jeton signé avec un autre secret", () => {
		const token = signSessionToken(NOW + 1000, "another-secret-that-is-not-the-right-one");
		expect(verifySessionToken(token, SECRET, NOW)).toBe(false);
	});

	it("refuse un expiry falsifié sous la signature d'origine", () => {
		const token = signSessionToken(NOW + 1000, SECRET);
		const [, hmac] = token.split(".");
		// L'attaquant repousse l'expiry en gardant le HMAC : signature invalide.
		expect(verifySessionToken(`${NOW + 999_999_999}.${hmac}`, SECRET, NOW)).toBe(false);
	});

	it("refuse un HMAC falsifié", () => {
		const token = signSessionToken(NOW + 1000, SECRET);
		const flipped = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
		expect(verifySessionToken(flipped, SECRET, NOW)).toBe(false);
	});

	it.each([
		["chaîne vide", ""],
		["sans point", "1234567890abcdef"],
		["point en tête", ".abcdef"],
		["payload non décimal", "12e3.abcdef"],
		["payload hexadécimal", "0x123.abcdef"],
		["payload avec espace", " 123.abcdef"],
		["payload négatif", "-123.abcdef"],
		["HMAC trop court", `${NOW + 1000}.abc`],
		["deux points", `${NOW + 1000}.ab.cd`],
	])("refuse un jeton malformé (%s) sans lever", (_label, token) => {
		expect(verifySessionToken(token, SECRET, NOW)).toBe(false);
	});

	it("refuse un jeton signé sans le préfixe de domaine (ancien schéma)", () => {
		// Avant la séparation de domaine (2026-08-15), le HMAC couvrait l'expiry
		// nu. Un tel jeton ne doit plus être accepté — et ce test verrouille au
		// passage qu'aucun HMAC calculé sur un payload SANS le préfixe
		// `admin-session.v1:` (ex. le token de suivi de commande, signé par le
		// même AUTH_SECRET) ne peut ouvrir une session admin.
		const expiry = NOW + 1000;
		const legacyHmac = createHmac("sha256", SECRET).update(String(expiry)).digest("hex");
		expect(verifySessionToken(`${expiry}.${legacyHmac}`, SECRET, NOW)).toBe(false);
	});

	it("le format émis est `<expiry>.<hmac hex 64>`", () => {
		const token = signSessionToken(NOW + 1000, SECRET);
		expect(token).toMatch(new RegExp(`^${NOW + 1000}\\.[0-9a-f]{64}$`));
	});
});
