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

test.describe("Performance budgets", () => {
	test("homepage - LCP under 3s", async ({ page }) => {
		await page.goto("/")

		const lcp = await measureLCP(page)

		expect(lcp, "LCP measurement was 0 - observer may not have captured it").toBeGreaterThan(0)
		expect(lcp, `LCP was ${lcp}ms, should be under 3000ms`).toBeLessThan(3000)
	})

	test("homepage - CLS under 0.15", async ({ page }) => {
		await page.goto("/")

		const cls = await measureCLS(page)

		expect(cls, `CLS was ${cls}, should be under 0.15`).toBeLessThan(0.15)
	})

	test("page produits - LCP under 3s", async ({ page }) => {
		await page.goto("/produits")

		const lcp = await measureLCP(page)

		expect(lcp, "LCP measurement was 0 - observer may not have captured it").toBeGreaterThan(0)
		expect(lcp, `LCP was ${lcp}ms, should be under 3000ms`).toBeLessThan(3000)
	})

	test("page produits - CLS under 0.15", async ({ page }) => {
		await page.goto("/produits")

		const cls = await measureCLS(page)

		expect(cls, `CLS was ${cls}, should be under 0.15`).toBeLessThan(0.15)
	})

	test("homepage - INP under 200ms", async ({ page }) => {
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

		expect(inp, `INP was ${inp}ms, should be under 200ms`).toBeLessThan(200)
	})

	const criticalPages = ["/", "/produits", "/collections", "/connexion", "/inscription"]

	for (const route of criticalPages) {
		test(`${route} loads under 3.5s`, async ({ page }) => {
			const startTime = Date.now()
			await page.goto(route)
			await page.waitForLoadState("domcontentloaded")
			const loadTime = Date.now() - startTime

			expect(loadTime, `${route} took ${loadTime}ms, should be under 3500ms`).toBeLessThan(3500)
		})
	}
})
