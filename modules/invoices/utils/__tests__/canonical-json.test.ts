import { describe, it, expect } from "vitest";
import { canonicalJsonStringify } from "../canonical-json";

describe("canonicalJsonStringify", () => {
	it("produit la même string pour deux objets sémantiquement identiques mais clés insérées différemment", () => {
		const a = { b: 1, a: 2, c: { y: 3, x: 4 } };
		const b = { c: { x: 4, y: 3 }, a: 2, b: 1 };
		expect(canonicalJsonStringify(a)).toBe(canonicalJsonStringify(b));
	});

	it("sérialise Date en ISO string (déterministe cross-runtime)", () => {
		const out = canonicalJsonStringify({ at: new Date("2026-05-28T10:30:00Z") });
		expect(out).toBe('{"at":"2026-05-28T10:30:00.000Z"}');
	});

	it("préserve l'ordre des items d'array (significatif sémantiquement)", () => {
		const out = canonicalJsonStringify({ items: [3, 1, 2] });
		expect(out).toBe('{"items":[3,1,2]}');
	});

	it("trie récursivement les clés à l'intérieur d'arrays d'objets", () => {
		const out = canonicalJsonStringify({
			lines: [
				{ z: 1, a: 2 },
				{ a: 3, z: 4 },
			],
		});
		expect(out).toBe('{"lines":[{"a":2,"z":1},{"a":3,"z":4}]}');
	});

	it("handles null and primitives", () => {
		expect(canonicalJsonStringify(null)).toBe("null");
		expect(canonicalJsonStringify(42)).toBe("42");
		expect(canonicalJsonStringify("hello")).toBe('"hello"');
		expect(canonicalJsonStringify(true)).toBe("true");
	});

	it("nested objects sorted at every depth", () => {
		const out = canonicalJsonStringify({
			z: { c: 1, a: { y: 2, x: 3 } },
			a: 4,
		});
		expect(out).toBe('{"a":4,"z":{"a":{"x":3,"y":2},"c":1}}');
	});
});
