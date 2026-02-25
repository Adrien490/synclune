import { test, expect } from "./fixtures"

test.describe("Performance budgets", () => {
	test("homepage - LCP under 4s", async ({ page }) => {
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

				// Give it time to report
				setTimeout(() => {
					observer.disconnect()
					resolve(lcpValue)
				}, 3000)
			})
		})

		// LCP should be under 4000ms (generous budget for CI)
		expect(lcp, `LCP was ${lcp}ms, should be under 4000ms`).toBeLessThan(4000)
	})

	test("homepage - CLS under 0.25", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		const cls = await page.evaluate(() => {
			return new Promise<number>((resolve) => {
				let clsValue = 0
				const observer = new PerformanceObserver((entryList) => {
					for (const entry of entryList.getEntries()) {
						if ("hadRecentInput" in entry && !(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) {
							clsValue += (entry as PerformanceEntry & { value: number }).value
						}
					}
				})
				observer.observe({ type: "layout-shift", buffered: true })

				setTimeout(() => {
					observer.disconnect()
					resolve(clsValue)
				}, 3000)
			})
		})

		// CLS should be under 0.25 (good threshold)
		expect(cls, `CLS was ${cls}, should be under 0.25`).toBeLessThan(0.25)
	})

	test("page produits - LCP under 4s", async ({ page }) => {
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
				}, 3000)
			})
		})

		expect(lcp, `LCP was ${lcp}ms, should be under 4000ms`).toBeLessThan(4000)
	})

	test("page produits - CLS under 0.25", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		const cls = await page.evaluate(() => {
			return new Promise<number>((resolve) => {
				let clsValue = 0
				const observer = new PerformanceObserver((entryList) => {
					for (const entry of entryList.getEntries()) {
						if ("hadRecentInput" in entry && !(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) {
							clsValue += (entry as PerformanceEntry & { value: number }).value
						}
					}
				})
				observer.observe({ type: "layout-shift", buffered: true })

				setTimeout(() => {
					observer.disconnect()
					resolve(clsValue)
				}, 3000)
			})
		})

		expect(cls, `CLS was ${cls}, should be under 0.25`).toBeLessThan(0.25)
	})

	test("les pages critiques chargent en moins de 5s", async ({ page }) => {
		const criticalPages = ["/", "/produits", "/collections", "/connexion", "/inscription"]

		for (const route of criticalPages) {
			const startTime = Date.now()
			await page.goto(route)
			await page.waitForLoadState("domcontentloaded")
			const loadTime = Date.now() - startTime

			expect(loadTime, `${route} took ${loadTime}ms, should be under 5000ms`).toBeLessThan(5000)
		}
	})
})
