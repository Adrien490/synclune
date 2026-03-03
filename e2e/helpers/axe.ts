import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const GLOBAL_EXCLUDES = ['[data-testid="particle-background"]'];
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export async function expectNoA11yViolations(
	page: Page,
	options?: {
		exclude?: string[];
		disableRules?: string[];
		context?: string;
	},
) {
	const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);

	for (const selector of [...GLOBAL_EXCLUDES, ...(options?.exclude ?? [])]) {
		builder.exclude(selector);
	}
	if (options?.disableRules?.length) {
		builder.disableRules(options.disableRules);
	}

	const results = await builder.analyze();

	if (results.violations.length > 0) {
		const summary = results.violations
			.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
			.join("\n");
		expect(
			results.violations,
			`Violations WCAG${options?.context ? ` sur ${options.context}` : ""}:\n${summary}`,
		).toEqual([]);
	}
}
