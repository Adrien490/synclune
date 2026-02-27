import { test, expect } from "./fixtures"

/**
 * Measures LCP using PerformanceObserver with buffered entries.
 * Uses requestAnimationFrame to ensure paint entries are flushed
 * before reading, instead of unreliable setTimeout.
 */
async function measureLCP(page: import("@playwright/test").Page): Promise<number> {
	return page.evaluate(() => {
		return new Promise<number>((resolve) => {
			let lcpValue = 0

			const observer = new PerformanceObserver((entryList) => {
				for (const entry of entryList.getEntries()) {
					lcpValue = entry.startTime
				}
			})
			observer.observe({ type: "largest-contentful-paint", buffered: true })

			// LCP is finalized after the page becomes interactive.
			// Wait for the document to be fully loaded, then use double-rAF
			// to ensure all paint entries have been dispatched.
			const onReady = () => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						observer.disconnect()
						resolve(lcpValue)
					})
				})
			}

			if (document.readyState === "complete") {
				onReady()
			} else {
				window.addEventListener("load", onReady, { once: true })
			}
		})
	})
}

/**
 * Measures CLS using PerformanceObserver with buffered entries.
 * Waits for document load + double-rAF to capture layout shifts.
 */
async function measureCLS(page: import("@playwright/test").Page): Promise<number> {
	return page.evaluate(() => {
		return new Promise<number>((resolve) => {
			let clsValue = 0

			const observer = new PerformanceObserver((entryList) => {
				for (const entry of entryList.getEntries()) {
					if ("hadRecentInput" in entry && !(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) {
						clsValue += (entry as unknown as PerformanceEntry & { value: number }).value
					}
				}
			})
			observer.observe({ type: "layout-shift", buffered: true })

			const onReady = () => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						observer.disconnect()
						resolve(clsValue)
					})
				})
			}

			if (document.readyState === "complete") {
				onReady()
			} else {
				window.addEventListener("load", onReady, { once: true })
			}
		})
	})
}

/**
 * CI runners are slower than local machines. Apply a multiplier to avoid false negatives.
 * Set CI_PERFORMANCE_MULTIPLIER env var to customize (default: 1.5x in CI).
 */
const PERF_MULTIPLIER = process.env.CI
	? parseFloat(process.env.CI_PERFORMANCE_MULTIPLIER ?? "1.5")
	: 1

const LCP_BUDGET = 3000 * PERF_MULTIPLIER
const CLS_BUDGET = 0.15
const INP_BUDGET = 200 * PERF_MULTIPLIER
const LOAD_BUDGET = 3500 * PERF_MULTIPLIER

test.describe("Performance budgets", { tag: ["@slow"] }, () => {
	test("homepage - LCP under budget", async ({ page }) => {
		await page.goto("/")

		const lcp = await measureLCP(page)

		expect(lcp, "LCP measurement was 0 - observer may not have captured it").toBeGreaterThan(0)
		expect(lcp, `LCP was ${lcp}ms, budget is ${LCP_BUDGET}ms`).toBeLessThan(LCP_BUDGET)
	})

	test("homepage - CLS under 0.15", async ({ page }) => {
		await page.goto("/")

		const cls = await measureCLS(page)

		expect(cls, `CLS was ${cls}, should be under ${CLS_BUDGET}`).toBeLessThan(CLS_BUDGET)
	})

	test("page produits - LCP under budget", async ({ page }) => {
		await page.goto("/produits")

		const lcp = await measureLCP(page)

		expect(lcp, "LCP measurement was 0 - observer may not have captured it").toBeGreaterThan(0)
		expect(lcp, `LCP was ${lcp}ms, budget is ${LCP_BUDGET}ms`).toBeLessThan(LCP_BUDGET)
	})

	test("page produits - CLS under 0.15", async ({ page }) => {
		await page.goto("/produits")

		const cls = await measureCLS(page)

		expect(cls, `CLS was ${cls}, should be under ${CLS_BUDGET}`).toBeLessThan(CLS_BUDGET)
	})

	test("homepage - INP under budget", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Set up INP observer BEFORE interaction
		await page.evaluate(() => {
			(window as unknown as { __inpEntries: number[] }).__inpEntries = []
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					const duration = (entry as unknown as { duration: number }).duration;
					(window as unknown as { __inpEntries: number[] }).__inpEntries.push(duration)
				}
			})
			observer.observe({ type: "event", buffered: true });
			(window as unknown as { __inpObserver: PerformanceObserver }).__inpObserver = observer
		})

		// Click an actual interactive element (button or link) instead of h1
		const interactiveElement = page.getByRole("link").first()
			.or(page.getByRole("button").first())
		await interactiveElement.click({ noWaitAfter: true })

		// Collect INP after interaction
		const inp = await page.evaluate(() => {
			return new Promise<number>((resolve) => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						const win = window as unknown as { __inpObserver: PerformanceObserver; __inpEntries: number[] }
						win.__inpObserver.disconnect()
						const maxDuration = Math.max(0, ...win.__inpEntries)
						resolve(maxDuration)
					})
				})
			})
		})

		expect(inp, `INP was ${inp}ms, budget is ${INP_BUDGET}ms`).toBeLessThan(INP_BUDGET)
	})

	const criticalPages = ["/", "/produits", "/collections", "/connexion", "/inscription"]

	for (const route of criticalPages) {
		test(`${route} loads under budget`, async ({ page }) => {
			const startTime = Date.now()
			await page.goto(route)
			await page.waitForLoadState("domcontentloaded")
			const loadTime = Date.now() - startTime

			expect(loadTime, `${route} took ${loadTime}ms, budget is ${LOAD_BUDGET}ms`).toBeLessThan(LOAD_BUDGET)
		})
	}
})
