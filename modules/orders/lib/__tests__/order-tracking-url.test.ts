/**
 * @regression order-tracking-url-fail-closed
 *
 * `buildOrderTrackingUrl` est la SSOT de l'URL de suivi emailée. Fail-closed :
 * sans `AUTH_SECRET`, PAS d'URL (l'email part sans CTA de suivi plutôt qu'avec
 * un lien mort ou non signé) ; sans email, pas d'URL non plus (le token signe
 * `orderId:email`, il serait invérifiable).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { signOrderTrackingToken } from "../order-tracking-token";
import { buildOrderTrackingUrl } from "../order-tracking-url";

const SECRET = "test-secret-of-sufficient-length-000";
const ORDER = { id: "k3x9m2p8q1r5s7t0uvwxyz012345", email: "cliente@example.com" };

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("buildOrderTrackingUrl", () => {
	it("fail-closed : sans AUTH_SECRET, aucune URL", () => {
		vi.stubEnv("AUTH_SECRET", "");
		expect(buildOrderTrackingUrl(ORDER)).toBeNull();
	});

	it("sans email (commande PENDING, l'adresse arrive au webhook), aucune URL", () => {
		vi.stubEnv("AUTH_SECRET", SECRET);
		expect(buildOrderTrackingUrl({ id: ORDER.id, email: "" })).toBeNull();
	});

	it("nominal : URL /suivi-commande avec l'id et le token signé attendus", () => {
		vi.stubEnv("AUTH_SECRET", SECRET);
		const url = buildOrderTrackingUrl(ORDER);
		const expectedToken = signOrderTrackingToken(ORDER.id, ORDER.email, SECRET);

		expect(url).not.toBeNull();
		const parsed = new URL(url!);
		expect(parsed.pathname).toBe("/suivi-commande");
		expect(parsed.searchParams.get("commande")).toBe(ORDER.id);
		expect(parsed.searchParams.get("token")).toBe(expectedToken);
	});
});
