/**
 * @regression order-tracking-token
 *
 * Le token de suivi est le SEUL accès client à une commande : il signe
 * `orderId:email` (HMAC-SHA256, AUTH_SECRET). Une signature invalide doit
 * rendre `false` — la page fait alors notFound(), sans distinguer « commande
 * inexistante » de « token faux » (anti-énumération).
 */
import { describe, expect, it } from "vitest";
import { signOrderTrackingToken, verifyOrderTrackingToken } from "../order-tracking-token";

const SECRET = "test-secret-of-sufficient-length-000";
const ORDER_ID = "k3x9m2p8q1r5s7t0uvwxyz012345";
const EMAIL = "cliente@example.com";

describe("signOrderTrackingToken", () => {
	it("rend 64 hex, stable pour les mêmes entrées", () => {
		const token = signOrderTrackingToken(ORDER_ID, EMAIL, SECRET);
		expect(token).toMatch(/^[0-9a-f]{64}$/);
		expect(signOrderTrackingToken(ORDER_ID, EMAIL, SECRET)).toBe(token);
	});

	it("est insensible à la casse et aux espaces de l'email (le lien survit à une saisie normalisée)", () => {
		expect(signOrderTrackingToken(ORDER_ID, "  Cliente@Example.COM ", SECRET)).toBe(
			signOrderTrackingToken(ORDER_ID, EMAIL, SECRET),
		);
	});
});

describe("verifyOrderTrackingToken", () => {
	const valid = signOrderTrackingToken(ORDER_ID, EMAIL, SECRET);

	it("accepte un token signé", () => {
		expect(verifyOrderTrackingToken(valid, ORDER_ID, EMAIL, SECRET)).toBe(true);
	});

	it("refuse un token altéré", () => {
		const tampered = (valid[0] === "a" ? "b" : "a") + valid.slice(1);
		expect(verifyOrderTrackingToken(tampered, ORDER_ID, EMAIL, SECRET)).toBe(false);
	});

	it("refuse le token d'une AUTRE commande (anti-énumération)", () => {
		expect(verifyOrderTrackingToken(valid, "autreorderid0000000000000000", EMAIL, SECRET)).toBe(
			false,
		);
	});

	it("refuse si l'email en base a changé", () => {
		expect(verifyOrderTrackingToken(valid, ORDER_ID, "autre@example.com", SECRET)).toBe(false);
	});

	it("refuse un secret différent", () => {
		expect(
			verifyOrderTrackingToken(valid, ORDER_ID, EMAIL, "autre-secret-0000000000000000000"),
		).toBe(false);
	});

	it("refuse les formats aberrants sans lever (vide, non-hex, longueur fausse)", () => {
		for (const bad of ["", "abc", "z".repeat(64), valid.slice(0, 63), `${valid}0`]) {
			expect(verifyOrderTrackingToken(bad, ORDER_ID, EMAIL, SECRET)).toBe(false);
		}
	});
});
