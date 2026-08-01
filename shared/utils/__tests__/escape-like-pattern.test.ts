import { describe, expect, it } from "vitest";

import { escapeLikePattern } from "../escape-like-pattern";

describe("escapeLikePattern", () => {
	it("échappe % (joker multi-caractères)", () => {
		expect(escapeLikePattern("100%")).toBe("100\\%");
	});

	it("échappe _ (joker mono-caractère)", () => {
		expect(escapeLikePattern("a_b")).toBe("a\\_b");
	});

	it("échappe le backslash lui-même", () => {
		expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
	});

	it("laisse un terme ordinaire intact", () => {
		expect(escapeLikePattern("bague dorée")).toBe("bague dorée");
	});

	it("échappe chaque occurrence", () => {
		expect(escapeLikePattern("%_%")).toBe("\\%\\_\\%");
	});
});
