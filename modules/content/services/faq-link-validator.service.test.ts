import { describe, expect, it } from "vitest";
import { validateFaqLinksConsistency } from "./faq-link-validator.service";

describe("validateFaqLinksConsistency", () => {
	it("returns null when answer has no placeholders", () => {
		expect(validateFaqLinksConsistency("Simple answer.", null)).toBeNull();
	});

	it("returns null when answer has no placeholders and links are provided", () => {
		const links = [{ text: "unused", href: "/unused" }];
		expect(validateFaqLinksConsistency("Simple answer.", links)).toBeNull();
	});

	it("returns null when all placeholders have matching links", () => {
		const links = [
			{ text: "FAQ", href: "/faq" },
			{ text: "contact", href: "/contact" },
		];
		expect(validateFaqLinksConsistency("See {{link0}} or {{link1}}.", links)).toBeNull();
	});

	it("returns error when placeholders exist but links is null", () => {
		const result = validateFaqLinksConsistency("See {{link0}}.", null);
		expect(result).toBe(
			"La réponse contient des placeholders de liens mais aucun lien n'est défini",
		);
	});

	it("returns error when placeholders exist but links is undefined", () => {
		const result = validateFaqLinksConsistency("See {{link0}}.", undefined);
		expect(result).toBe(
			"La réponse contient des placeholders de liens mais aucun lien n'est défini",
		);
	});

	it("returns error when placeholders exist but links array is empty", () => {
		const result = validateFaqLinksConsistency("See {{link0}}.", []);
		expect(result).toBe(
			"La réponse contient des placeholders de liens mais aucun lien n'est défini",
		);
	});

	it("returns error for specific missing placeholder", () => {
		const links = [{ text: "existing", href: "/exists" }];
		const result = validateFaqLinksConsistency("See {{link0}} and {{link1}}.", links);
		expect(result).toBe("Le placeholder {{link1}} n'a pas de lien correspondant");
	});

	it("returns error for first missing placeholder when multiple are missing", () => {
		const result = validateFaqLinksConsistency("See {{link0}} and {{link2}}.", [
			{ text: "zero", href: "/zero" },
		]);
		expect(result).toBe("Le placeholder {{link2}} n'a pas de lien correspondant");
	});

	it("handles non-sequential placeholder indices", () => {
		const links = [{ text: "zero", href: "/zero" }];
		const result = validateFaqLinksConsistency("See {{link5}}.", links);
		expect(result).toBe("Le placeholder {{link5}} n'a pas de lien correspondant");
	});
});
