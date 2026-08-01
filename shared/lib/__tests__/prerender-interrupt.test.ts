import { describe, it, expect, afterEach, vi } from "vitest";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { isPrerenderInterrupt } from "../prerender-interrupt";

/** Réplique de `HangingPromiseRejectionError` (next/dist/server/dynamic-rendering-utils). */
const hangingPromiseRejection = () =>
	Object.assign(
		new Error(
			'During prerendering, `headers()` rejects when the prerender is complete. This occurred at route "/cgv".',
		),
		{ digest: "HANGING_PROMISE_REJECTION" },
	);

describe("isPrerenderInterrupt", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("reconnaît le rejet HANGING_PROMISE_REJECTION de headers()/cookies()", () => {
		expect(isPrerenderInterrupt(hangingPromiseRejection())).toBe(true);
	});

	it("reconnaît le digest NEXT_PRERENDER_INTERRUPTED", () => {
		const err = Object.assign(new Error("interrupted"), {
			digest: "NEXT_PRERENDER_INTERRUPTED",
		});
		expect(isPrerenderInterrupt(err)).toBe(true);
	});

	it('reconnaît « Connection closed. » (flux Flight d\'une lecture "use cache" avortée) UNIQUEMENT en phase build', () => {
		vi.stubEnv("NEXT_PHASE", PHASE_PRODUCTION_BUILD);
		expect(isPrerenderInterrupt(new Error("Connection closed."))).toBe(true);
	});

	it("NE reconnaît PAS « Connection closed. » hors phase build (vrai incident réseau/DB à logger)", () => {
		vi.stubEnv("NEXT_PHASE", "");
		expect(isPrerenderInterrupt(new Error("Connection closed."))).toBe(false);
	});

	it("suit la chaîne `cause`, comme unstable_rethrow", () => {
		const wrapped = new Error("fetch failed", { cause: hangingPromiseRejection() });
		expect(isPrerenderInterrupt(wrapped)).toBe(true);
	});

	it("rejette une erreur ordinaire, un digest inconnu et les non-erreurs", () => {
		expect(isPrerenderInterrupt(new Error("DB timeout"))).toBe(false);
		expect(isPrerenderInterrupt(Object.assign(new Error("x"), { digest: "NEXT_REDIRECT" }))).toBe(
			false,
		);
		expect(isPrerenderInterrupt("Connection closed.")).toBe(false);
		expect(isPrerenderInterrupt(null)).toBe(false);
		expect(isPrerenderInterrupt(undefined)).toBe(false);
	});
});
