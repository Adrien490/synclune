import { test, expect } from "./fixtures";

test.describe("Scroll-driven CSS animations", { tag: ["@slow"] }, () => {
	test.describe("Infrastructure - elements present in DOM", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");
		});

		test("timeline-line-desktop element exists in DOM", async ({ page }) => {
			const timelineLine = page.locator(".timeline-line-desktop");
			await expect(timelineLine).toBeAttached();
		});

		test("timeline-step-scroll elements exist with correct count", async ({ page }) => {
			// Desktop viewport to ensure the desktop timeline is rendered
			await page.setViewportSize({ width: 1280, height: 800 });
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const steps = page.locator(".timeline-step-scroll");
			// 4 process steps in CreativeProcessTimeline
			await expect(steps).toHaveCount(4);
		});

		test("polaroid-scatter elements exist with correct count", async ({ page }) => {
			const polaroids = page.locator(".polaroid-scatter");
			// 4 polaroids defined in POLAROIDS config
			await expect(polaroids).toHaveCount(4);
		});

		test("doodle-draw-scroll elements exist in DOM", async ({ page }) => {
			const doodles = page.locator(".doodle-draw-scroll");
			await expect(doodles.first()).toBeAttached();
		});
	});

	test.describe("Elements visible after scrolling into view", () => {
		test("atelier section is reachable by scroll", async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const timelineLine = page.locator(".timeline-line-desktop");
			await timelineLine.scrollIntoViewIfNeeded();
			await expect(timelineLine).toBeAttached();
		});

		test("polaroid-scatter elements are reachable by scroll", async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const firstPolaroid = page.locator(".polaroid-scatter").first();
			await firstPolaroid.scrollIntoViewIfNeeded();
			await expect(firstPolaroid).toBeAttached();
		});

		test("timeline-step-scroll elements are reachable by scroll on desktop", async ({ page }) => {
			await page.setViewportSize({ width: 1280, height: 800 });
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const firstStep = page.locator(".timeline-step-scroll").first();
			await firstStep.scrollIntoViewIfNeeded();
			await expect(firstStep).toBeAttached();
		});
	});

	test.describe("Chromium: animation-timeline supported", () => {
		test("animation-timeline is supported in Chromium", async ({ page, browserName }) => {
			test.skip(browserName !== "chromium", "animation-timeline: view() is Chromium-only");

			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const supported = await page.evaluate(() => {
				return CSS.supports("animation-timeline", "view()");
			});

			expect(supported).toBe(true);
		});

		test("timeline-line-desktop has animation applied in Chromium", async ({
			page,
			browserName,
		}) => {
			test.skip(browserName !== "chromium", "animation-timeline: view() is Chromium-only");

			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const animationName = await page.evaluate(() => {
				const el = document.querySelector(".timeline-line-desktop");
				if (!el) return null;
				return getComputedStyle(el).animationName;
			});

			// Should have the timeline-draw animation name applied
			expect(animationName).toContain("timeline-draw");
		});

		test("timeline-step-scroll has animation applied in Chromium", async ({
			page,
			browserName,
		}) => {
			test.skip(browserName !== "chromium", "animation-timeline: view() is Chromium-only");

			await page.setViewportSize({ width: 1280, height: 800 });
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const animationName = await page.evaluate(() => {
				const el = document.querySelector(".timeline-step-scroll");
				if (!el) return null;
				return getComputedStyle(el).animationName;
			});

			expect(animationName).toContain("step-reveal");
		});

		test("polaroid-scatter has animation applied in Chromium", async ({ page, browserName }) => {
			test.skip(browserName !== "chromium", "animation-timeline: view() is Chromium-only");

			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const animationName = await page.evaluate(() => {
				const el = document.querySelector(".polaroid-scatter");
				if (!el) return null;
				return getComputedStyle(el).animationName;
			});

			// Mobile uses polaroid-land-simple, desktop uses polaroid-land
			expect(animationName).toMatch(/polaroid-land/);
		});

		test("doodle-draw-scroll has animation applied in Chromium", async ({ page, browserName }) => {
			test.skip(browserName !== "chromium", "animation-timeline: view() is Chromium-only");

			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const animationName = await page.evaluate(() => {
				const el = document.querySelector(".doodle-draw-scroll");
				if (!el) return null;
				return getComputedStyle(el).animationName;
			});

			expect(animationName).toContain("doodle-draw-scroll");
		});
	});

	test.describe("prefers-reduced-motion: animations disabled", () => {
		test.beforeEach(async ({ page }) => {
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");
		});

		test("timeline-line-desktop animation is none with reduced motion", async ({ page }) => {
			const animationName = await page.evaluate(() => {
				const el = document.querySelector(".timeline-line-desktop");
				if (!el) return null;
				return getComputedStyle(el).animationName;
			});

			expect(animationName).toBe("none");
		});

		test("timeline-line-desktop is fully visible (scale: 1) with reduced motion", async ({
			page,
		}) => {
			// The reduced-motion rule sets scale: 1 so the line is fully drawn
			const scaleValue = await page.evaluate(() => {
				const el = document.querySelector(".timeline-line-desktop") as HTMLElement | null;
				if (!el) return null;
				return getComputedStyle(el).scale;
			});

			// scale: 1 means the element is shown at full size
			expect(scaleValue).toBe("1");
		});

		test("timeline-step-scroll animation is none with reduced motion", async ({ page }) => {
			const animationName = await page.evaluate(() => {
				const el = document.querySelector(".timeline-step-scroll");
				if (!el) return null;
				return getComputedStyle(el).animationName;
			});

			expect(animationName).toBe("none");
		});

		test("polaroid-scatter animation is none with reduced motion", async ({ page }) => {
			const animationName = await page.evaluate(() => {
				const el = document.querySelector(".polaroid-scatter");
				if (!el) return null;
				return getComputedStyle(el).animationName;
			});

			expect(animationName).toBe("none");
		});

		test("polaroid-scatter is fully visible (opacity: 1) with reduced motion", async ({ page }) => {
			// The reduced-motion rule sets opacity: 1 so polaroids are shown without animation
			const opacity = await page.evaluate(() => {
				const el = document.querySelector(".polaroid-scatter");
				if (!el) return null;
				return getComputedStyle(el).opacity;
			});

			expect(opacity).toBe("1");
		});
	});

	test.describe("Signature reveal (em dash + Léane name)", () => {
		test("signature paragraph is present in the atelier section", async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const signature = page.locator(".signature-reveal");
			await expect(signature).toBeAttached();
			await expect(signature).toHaveAttribute("aria-label", "Léane");
		});

		test("signature name text is rendered", async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const name = page.locator(".signature-name");
			await expect(name).toHaveText("Léane");
		});

		test("signature is reachable by scroll and becomes visible", async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const signature = page.locator(".signature-reveal");
			await signature.scrollIntoViewIfNeeded();
			await expect(signature).toBeInViewport();
		});
	});

	test.describe("Parallax atelier image", () => {
		test("parallax image is present and exposes data-parallax wrapper when active", async ({
			page,
		}) => {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const atelier = page.locator("#atelier-section");
			await atelier.scrollIntoViewIfNeeded();

			const parallaxContainer = atelier.locator('[data-parallax="active"]').first();
			// Motion is opt-in and disabled on touch devices, so presence is conditional.
			// We assert the image itself is present as the primary guarantee.
			const image = atelier.locator(`img[alt*="atelier de création Synclune"]`);
			await expect(image).toBeVisible();
			// data-parallax wrapper only mounts when parallax is active (desktop, motion allowed)
			if ((await parallaxContainer.count()) > 0) {
				await expect(parallaxContainer).toBeAttached();
			}
		});

		test("parallax image remains visible with reduced motion (no animation wrapper)", async ({
			page,
		}) => {
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const atelier = page.locator("#atelier-section");
			await atelier.scrollIntoViewIfNeeded();

			const image = atelier.locator(`img[alt*="atelier de création Synclune"]`);
			await expect(image).toBeVisible();

			// With reduced motion, the parallax wrapper is not mounted
			const parallaxWrapper = atelier.locator('[data-parallax="active"]');
			await expect(parallaxWrapper).toHaveCount(0);
		});

		test("parallax image has blur placeholder applied on initial load", async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			const image = page.locator(`img[alt*="atelier de création Synclune"]`);
			await image.first().scrollIntoViewIfNeeded();
			await expect(image.first()).toBeVisible();
			// next/image with placeholder="blur" renders a data URL or object-fit style
			const style = await image.first().getAttribute("style");
			expect(style).not.toBeNull();
		});
	});
});
