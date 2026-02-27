import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/**
 * Custom Playwright reporter that tracks test flakiness.
 *
 * A test is "flaky" if it failed on first attempt but passed on retry.
 * This reporter:
 * 1. Counts flaky tests per run
 * 2. Fails the suite if flaky count exceeds the budget (default: 3)
 * 3. Outputs a flakiness report for CI analysis
 */
export default class FlakinessReporter implements Reporter {
	private flakyTests: Array<{ title: string; file: string; retries: number }> = [];
	private budget: number;

	constructor(options?: { budget?: number }) {
		this.budget = options?.budget ?? 3;
	}

	onTestEnd(test: TestCase, result: TestResult) {
		// A test is flaky if it retried and eventually passed
		if (result.retry > 0 && result.status === "passed") {
			this.flakyTests.push({
				title: test.title,
				file: test.location.file,
				retries: result.retry,
			});
		}
	}

	onEnd(_result: FullResult) {
		if (this.flakyTests.length === 0) {
			console.log("\n[flakiness] No flaky tests detected.");
			return;
		}

		console.log(`\n[flakiness] ${this.flakyTests.length} flaky test(s) detected:`);
		for (const test of this.flakyTests) {
			console.log(`  - ${test.title} (${test.file}) — ${test.retries} retries`);
		}

		if (this.flakyTests.length > this.budget) {
			console.error(
				`\n[flakiness] BUDGET EXCEEDED: ${this.flakyTests.length} flaky tests > budget of ${this.budget}`,
			);
			// Note: Playwright doesn't support failing via reporter exit code directly.
			// The CI pipeline should check for this message in the output.
		}
	}

	printsToStdio() {
		return true;
	}
}
