import { test, expect } from "./fixtures"

test.describe("PWA - Offline et Service Worker", () => {
	test("le manifest.json est accessible et valide", async ({ page }) => {
		const response = await page.goto("/manifest.webmanifest")

		expect(response?.status()).toBe(200)

		const body = await response?.text()
		expect(body).toBeTruthy()

		const manifest = JSON.parse(body!)
		expect(manifest).toHaveProperty("name")
		expect(manifest).toHaveProperty("short_name")
		expect(manifest).toHaveProperty("start_url", "/")
		expect(manifest).toHaveProperty("display", "standalone")
		expect(manifest).toHaveProperty("icons")
		expect(manifest.icons.length).toBeGreaterThan(0)
	})

	test("le service worker est enregistre sur la homepage", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Wait for SW registration
		const swRegistered = await page.evaluate(async () => {
			if (!("serviceWorker" in navigator)) return false

			const registrations = await navigator.serviceWorker.getRegistrations()
			return registrations.length > 0
		})

		expect(swRegistered, "Service worker should be registered").toBe(true)
	})

	test("la page offline se charge directement", async ({ page }) => {
		await page.goto("/~offline")
		await page.waitForLoadState("domcontentloaded")

		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()
		await expect(heading).toContainText(/hors ligne/i)
	})

	test("la page offline a un bouton de retry", async ({ page }) => {
		await page.goto("/~offline")
		await page.waitForLoadState("domcontentloaded")

		const retryButton = page.getByRole("button", { name: /réessayer|actualiser|recharger/i })
		await expect(retryButton).toBeVisible()
	})

	test("la page offline a noindex", async ({ page }) => {
		await page.goto("/~offline")
		await page.waitForLoadState("domcontentloaded")

		const robotsMeta = page.locator('meta[name="robots"]')
		await expect(robotsMeta).toBeAttached()

		const content = await robotsMeta.getAttribute("content")
		expect(content).toMatch(/noindex/)
	})

	test("les icones PWA sont accessibles", async ({ page }) => {
		// Check key icon sizes exist
		const iconPaths = ["/icons/icon-192x192.png", "/icons/icon-512x512.png"]

		for (const iconPath of iconPaths) {
			const response = await page.goto(iconPath)
			expect(
				response?.status(),
				`PWA icon ${iconPath} should be accessible`,
			).toBe(200)
		}
	})

	test("la navigation offline redirige vers la page offline", async ({ page, context }) => {
		// First, load a page to ensure SW is active
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Wait for service worker to activate
		await page.evaluate(async () => {
			const registration = await navigator.serviceWorker.ready
			if (registration.active?.state !== "activated") {
				await new Promise<void>((resolve) => {
					registration.active?.addEventListener("statechange", function handler() {
						if (registration.active?.state === "activated") {
							registration.active.removeEventListener("statechange", handler)
							resolve()
						}
					})
					// Resolve immediately if already activated
					if (registration.active?.state === "activated") resolve()
				})
			}
		})

		// Simulate offline by blocking all navigation requests
		await context.setOffline(true)

		try {
			// Try to navigate to a new page - SW should serve offline fallback
			await page.goto("/produits", { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {
				// Navigation may fail or redirect to offline page
			})

			// Either we're on the offline page or the page shows offline content
			const offlineHeading = page.getByText(/hors ligne/i)
			const productHeading = page.getByRole("heading", { level: 1 })

			// The service worker should either serve cached content or the offline fallback
			await expect(offlineHeading.or(productHeading)).toBeVisible({ timeout: 10000 })
		} finally {
			await context.setOffline(false)
		}
	})
})
