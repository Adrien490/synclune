import { describe, expect, it, vi } from "vitest";
import type { FaqItemData, FaqLink } from "./faq-utils";
import {
	generateFaqSchema,
	getPlainTextAnswer,
	parseAnswerSegments,
	validateFaqPlaceholders,
} from "./faq-utils";

// ─── parseAnswerSegments ────────────────────────────────────────────

describe("parseAnswerSegments", () => {
	it("returns a single text segment when no links are provided", () => {
		const result = parseAnswerSegments("Hello world");
		expect(result).toEqual([{ type: "text", value: "Hello world" }]);
	});

	it("returns a single text segment when links array is empty", () => {
		const result = parseAnswerSegments("Hello world", []);
		expect(result).toEqual([{ type: "text", value: "Hello world" }]);
	});

	it("resolves a single placeholder into text + link + text", () => {
		const links: FaqLink[] = [{ text: "our page", href: "/page" }];
		const result = parseAnswerSegments("Visit {{link0}} now.", links);
		expect(result).toEqual([
			{ type: "text", value: "Visit " },
			{ type: "link", text: "our page", href: "/page" },
			{ type: "text", value: " now." },
		]);
	});

	it("resolves multiple placeholders", () => {
		const links: FaqLink[] = [
			{ text: "FAQ", href: "/faq" },
			{ text: "contact", href: "/contact" },
		];
		const result = parseAnswerSegments(
			"See our {{link0}} or {{link1}}.",
			links,
		);
		expect(result).toEqual([
			{ type: "text", value: "See our " },
			{ type: "link", text: "FAQ", href: "/faq" },
			{ type: "text", value: " or " },
			{ type: "link", text: "contact", href: "/contact" },
			{ type: "text", value: "." },
		]);
	});

	it("handles placeholder at the start of the string", () => {
		const links: FaqLink[] = [{ text: "Click here", href: "/here" }];
		const result = parseAnswerSegments("{{link0}} to begin.", links);
		expect(result).toEqual([
			{ type: "link", text: "Click here", href: "/here" },
			{ type: "text", value: " to begin." },
		]);
	});

	it("handles placeholder at the end of the string", () => {
		const links: FaqLink[] = [{ text: "details", href: "/details" }];
		const result = parseAnswerSegments("See {{link0}}", links);
		expect(result).toEqual([
			{ type: "text", value: "See " },
			{ type: "link", text: "details", href: "/details" },
		]);
	});

	it("skips missing link placeholders silently", () => {
		const links: FaqLink[] = [{ text: "existing", href: "/exists" }];
		const result = parseAnswerSegments(
			"See {{link0}} and {{link1}}.",
			links,
		);
		expect(result).toEqual([
			{ type: "text", value: "See " },
			{ type: "link", text: "existing", href: "/exists" },
			{ type: "text", value: " and " },
			{ type: "text", value: "." },
		]);
	});

	it("handles answer with no placeholders but with links provided", () => {
		const links: FaqLink[] = [{ text: "unused", href: "/unused" }];
		const result = parseAnswerSegments("No placeholders here.", links);
		expect(result).toEqual([
			{ type: "text", value: "No placeholders here." },
		]);
	});
});

// ─── getPlainTextAnswer ─────────────────────────────────────────────

describe("getPlainTextAnswer", () => {
	it("returns the answer unchanged when no links", () => {
		expect(getPlainTextAnswer("Hello world")).toBe("Hello world");
	});

	it("returns the answer unchanged when links array is empty", () => {
		expect(getPlainTextAnswer("Hello world", [])).toBe("Hello world");
	});

	it("replaces placeholder with link text", () => {
		const links: FaqLink[] = [{ text: "conditions de vente", href: "/cgv" }];
		expect(getPlainTextAnswer("Voir nos {{link0}}.", links)).toBe(
			"Voir nos conditions de vente.",
		);
	});

	it("replaces multiple placeholders", () => {
		const links: FaqLink[] = [
			{ text: "FAQ", href: "/faq" },
			{ text: "contact", href: "/contact" },
		];
		expect(
			getPlainTextAnswer("Voir {{link0}} ou {{link1}}.", links),
		).toBe("Voir FAQ ou contact.");
	});

	it("replaces missing placeholder with empty string", () => {
		const links: FaqLink[] = [{ text: "existing", href: "/exists" }];
		expect(
			getPlainTextAnswer("See {{link0}} and {{link1}}.", links),
		).toBe("See existing and .");
	});
});

// ─── generateFaqSchema ──────────────────────────────────────────────

describe("generateFaqSchema", () => {
	const items: FaqItemData[] = [
		{
			question: "Question 1 ?",
			answer: "Answer with {{link0}}.",
			icon: null as unknown as FaqItemData["icon"],
			links: [{ text: "a link", href: "/link" }],
		},
		{
			question: "Question 2 ?",
			answer: "Plain answer.",
			icon: null as unknown as FaqItemData["icon"],
		},
	];

	it("produces valid FAQPage schema structure", () => {
		const schema = generateFaqSchema(items);
		expect(schema["@context"]).toBe("https://schema.org");
		expect(schema["@type"]).toBe("FAQPage");
		expect(schema.inLanguage).toBe("fr-FR");
		expect(schema.mainEntity).toHaveLength(2);
	});

	it("uses plain text answers (placeholders resolved)", () => {
		const schema = generateFaqSchema(items);
		expect(schema.mainEntity[0]).toEqual({
			"@type": "Question",
			name: "Question 1 ?",
			acceptedAnswer: {
				"@type": "Answer",
				text: "Answer with a link.",
			},
		});
	});

	it("passes through answers without placeholders unchanged", () => {
		const schema = generateFaqSchema(items);
		expect(schema.mainEntity[1].acceptedAnswer.text).toBe("Plain answer.");
	});

	it("handles empty items array", () => {
		const schema = generateFaqSchema([]);
		expect(schema.mainEntity).toEqual([]);
	});
});

// ─── validateFaqPlaceholders ────────────────────────────────────────

describe("validateFaqPlaceholders", () => {
	it("warns when a placeholder has no matching link", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

		validateFaqPlaceholders([
			{
				question: "Test question?",
				answer: "See {{link0}} and {{link1}}.",
				icon: null as unknown as FaqItemData["icon"],
				links: [{ text: "only one", href: "/one" }],
			},
		]);

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(
			'FAQ "Test question?": placeholder {{link1}} has no matching link',
		);

		spy.mockRestore();
	});

	it("does not warn when all placeholders have matching links", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

		validateFaqPlaceholders([
			{
				question: "Valid question?",
				answer: "See {{link0}}.",
				icon: null as unknown as FaqItemData["icon"],
				links: [{ text: "valid", href: "/valid" }],
			},
		]);

		expect(spy).not.toHaveBeenCalled();

		spy.mockRestore();
	});

	it("does not warn when answer has no placeholders", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

		validateFaqPlaceholders([
			{
				question: "No links?",
				answer: "No placeholders here.",
				icon: null as unknown as FaqItemData["icon"],
			},
		]);

		expect(spy).not.toHaveBeenCalled();

		spy.mockRestore();
	});
});
