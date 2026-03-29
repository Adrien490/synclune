import type { Page, Route } from "@playwright/test";

/**
 * Network interception utilities for E2E tests.
 * Simulate offline mode and API errors.
 */

/**
 * Simulate offline by aborting all network requests.
 * Returns a cleanup function to restore connectivity.
 */
export async function simulateOffline(page: Page): Promise<() => Promise<void>> {
	const handler = (route: Route) => route.abort("connectionfailed");
	await page.route("**/*", handler);
	return () => page.unroute("**/*", handler);
}

/**
 * Intercept a specific API route and return an error response.
 */
export async function interceptApiWithError(
	page: Page,
	urlPattern: string | RegExp,
	options?: {
		status?: number;
		body?: string;
	},
): Promise<void> {
	const status = options?.status ?? 500;
	const body = options?.body ?? JSON.stringify({ error: "Internal Server Error" });

	await page.route(urlPattern, (route) =>
		route.fulfill({
			status,
			contentType: "application/json",
			body,
		}),
	);
}

/**
 * Wait for a specific API response and return its status.
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp): Promise<number> {
	const response = await page.waitForResponse(urlPattern);
	return response.status();
}
