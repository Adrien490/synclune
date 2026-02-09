import type { ReactNode } from "react";

export interface FaqLink {
	text: string;
	href: string;
}

export interface FaqItemData {
	question: string;
	answer: string;
	icon: ReactNode;
	links?: FaqLink[];
}

const LINK_PLACEHOLDER_REGEX = /\{\{link(\d+)\}\}/g;

export type AnswerSegment =
	| { type: "text"; value: string }
	| { type: "link"; text: string; href: string };

export function parseAnswerSegments(
	answer: string,
	links?: FaqLink[],
): AnswerSegment[] {
	if (!links || links.length === 0) {
		return [{ type: "text", value: answer }];
	}

	const segments: AnswerSegment[] = [];
	let lastIndex = 0;

	for (const match of answer.matchAll(LINK_PLACEHOLDER_REGEX)) {
		const matchIndex = match.index;
		if (matchIndex === undefined) continue;

		if (matchIndex > lastIndex) {
			segments.push({ type: "text", value: answer.slice(lastIndex, matchIndex) });
		}

		const linkIndex = Number.parseInt(match[1], 10);
		const link = links[linkIndex];

		if (link) {
			segments.push({ type: "link", text: link.text, href: link.href });
		}
		// Skip silently — missing link placeholder should not be shown to users

		lastIndex = matchIndex + match[0].length;
	}

	if (lastIndex < answer.length) {
		segments.push({ type: "text", value: answer.slice(lastIndex) });
	}

	return segments;
}

export function getPlainTextAnswer(answer: string, links?: FaqLink[]): string {
	if (!links || links.length === 0) {
		return answer;
	}

	return answer.replace(LINK_PLACEHOLDER_REGEX, (_, index) => {
		const link = links[Number.parseInt(index, 10)];
		return link ? link.text : "";
	});
}

export function generateFaqSchema(items: FaqItemData[]) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		inLanguage: "fr-FR",
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: getPlainTextAnswer(item.answer, item.links),
			},
		})),
	};
}

export function validateFaqPlaceholders(items: FaqItemData[]) {
	const REGEX = /\{\{link(\d+)\}\}/g;
	for (const item of items) {
		const matches = item.answer.matchAll(REGEX);
		for (const match of matches) {
			const idx = Number.parseInt(match[1], 10);
			if (!item.links?.[idx]) {
				console.warn(
					`FAQ "${item.question}": placeholder {{link${idx}}} has no matching link`,
				);
			}
		}
	}
}
