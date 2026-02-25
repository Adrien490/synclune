import { test, expect } from "./fixtures"

test.describe("Performance budgets", () => {
	test("homepage - LCP under 3s", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		const lcp = await page.evaluate(() => {
			return new Promise<number>((resolve) => {
				let lcpValue = 0
				const observer = new PerformanceObserver((entryList) => {
					const entries = entryList.getEntries()
					for (const entry of entries) {
						lcpValue = entry.startTime
					}
				})
				observer.observe({ type: "largest-contentful-paint", buffered: true })

				setTimeout(() => {
					observer.disconnect()
					resolve(lcpValue)
				}, 5000)
			})
		})

		expect(lcp, "LCP measurement was 0 - observer may not have captured it").toBeGreaterThan(0)
		expect(lcp, `LCP was ${lcp}ms, should be under 3000ms`).toBeLessThan(3000)
	})

	test("homepage - CLS under 0.15", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		const cls = await page.evaluate(() => {
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

				setTimeout(() => {
					observer.disconnect()
					resolve(clsValue)
				}, 5000)
			})
		})

		expect(cls, `CLS was ${cls}, should be under 0.15`).toBeLessThan(0.15)
	})

	test("page produits - LCP under 3s", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		const lcp = await page.evaluate(() => {
			return new Promise<number>((resolve) => {
				let lcpValue = 0
				const observer = new PerformanceObserver((entryList) => {
					for (const entry of entryList.getEntries()) {
						lcpValue = entry.startTime
					}
				})
				observer.observe({ type: "largest-contentful-paint", buffered: true })

				setTimeout(() => {
					observer.disconnect()
					resolve(lcpValue)
				}, 5000)
			})
		})

		expect(lcp, "LCP measurement was 0 - observer may not have captured it").toBeGreaterThan(0)
		expect(lcp, `LCP was ${lcp}ms, should be under 3000ms`).toBeLessThan(3000)
	})

	test("page produits - CLS under 0.15", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		const cls = await page.evaluate(() => {
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

				setTimeout(() => {
					observer.disconnect()
					resolve(clsValue)
				}, 5000)
			})
		})

		expect(cls, `CLS was ${cls}, should be under 0.15`).toBeLessThan(0.15)
	})

	test("homepage - INP under 200ms", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Trigger an interaction to measure
		const heading = page.getByRole("heading", { level: 1 })
		await heading.click()

		const inp = await page.evaluate(() => {
			return new Promise<number>((resolve) => {
				let maxDuration = 0
				const observer = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						const duration = (entry as unknown as { duration: number }).duration
						if (duration > maxDuration) maxDuration = duration
					}
				})
				observer.observe({ type: "event", buffered: true })
				setTimeout(() => {
					observer.disconnect()
					resolve(maxDuration)
				}, 3000)
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
