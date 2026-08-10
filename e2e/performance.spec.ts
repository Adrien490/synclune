import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * L'entrée LCP retenue : son instant, mais aussi QUI la porte.
 *
 * ⚠️ L'identité de l'élément n'est pas du confort de debug. Plusieurs décisions de
 * perf du dépôt sont justifiées par une hypothèse sur le porteur du LCP — le
 * `preload: true` de la display (Winky Sans) dans `shared/styles/fonts.ts` l'est « parce que le h1
 * de l'étal porte le LCP », et le refus de précharger le corps (Onest) l'est par le même
 * raisonnement. Tant qu'on ne mesurait que l'INSTANT, cette hypothèse ne pouvait
 * ni se confirmer ni se démentir : un budget vert la laissait vivre intacte.
 */
interface LcpMeasurement {
	/** Instant du LCP, en ms depuis le début de la navigation. 0 si rien n'a été capté. */
	startTime: number;
	/** Balise du porteur (`H1`, `IMG`, …), ou `null` s'il a quitté le DOM depuis. */
	tagName: string | null;
	/** Chaîne vide si le porteur n'a pas d'`id` — c'est déjà la convention du DOM. */
	id: string;
	/** Renseigné pour une image ; chaîne vide pour un bloc de texte. */
	url: string;
	/** Aire en px² retenue par le navigateur — c'est elle qui départage les candidats. */
	size: number;
}

/**
 * Measures LCP using PerformanceObserver with buffered entries.
 * Uses requestAnimationFrame to ensure paint entries are flushed
 * before reading, instead of unreliable setTimeout.
 */
async function measureLCP(page: Page): Promise<LcpMeasurement> {
	return page.evaluate(() => {
		return new Promise<LcpMeasurement>((resolve) => {
			// `element` est une référence DOM vivante : elle ne franchit pas la
			// frontière d'évaluation. On extrait ce qu'on veut savoir ici.
			let latest: LcpMeasurement = { startTime: 0, tagName: null, id: "", url: "", size: 0 };

			const observer = new PerformanceObserver((entryList) => {
				for (const entry of entryList.getEntries()) {
					const lcp = entry as PerformanceEntry & {
						element?: Element | null;
						id?: string;
						url?: string;
						size?: number;
					};
					latest = {
						startTime: lcp.startTime,
						tagName: lcp.element?.tagName ?? null,
						id: lcp.element?.id ?? "",
						url: lcp.url ?? "",
						size: lcp.size ?? 0,
					};
				}
			});
			observer.observe({ type: "largest-contentful-paint", buffered: true });

			// LCP is finalized after the page becomes interactive.
			// Wait for the document to be fully loaded, then use double-rAF
			// to ensure all paint entries have been dispatched.
			const onReady = () => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						observer.disconnect();
						resolve(latest);
					});
				});
			};

			if (document.readyState === "complete") {
				onReady();
			} else {
				window.addEventListener("load", onReady, { once: true });
			}
		});
	});
}

/**
 * Measures CLS using PerformanceObserver with buffered entries.
 * Waits for document load + double-rAF to capture layout shifts.
 */
async function measureCLS(page: Page): Promise<number> {
	return page.evaluate(() => {
		return new Promise<number>((resolve) => {
			let clsValue = 0;

			const observer = new PerformanceObserver((entryList) => {
				for (const entry of entryList.getEntries()) {
					if (
						"hadRecentInput" in entry &&
						!(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput
					) {
						clsValue += (entry as unknown as PerformanceEntry & { value: number }).value;
					}
				}
			});
			observer.observe({ type: "layout-shift", buffered: true });

			const onReady = () => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						observer.disconnect();
						resolve(clsValue);
					});
				});
			};

			if (document.readyState === "complete") {
				onReady();
			} else {
				window.addEventListener("load", onReady, { once: true });
			}
		});
	});
}

/**
 * CI runners are slower than local machines. Apply a multiplier to avoid false negatives.
 * Set CI_PERFORMANCE_MULTIPLIER env var to customize (default: 1.5x in CI).
 */
const PERF_MULTIPLIER = process.env.CI
	? parseFloat(process.env.CI_PERFORMANCE_MULTIPLIER ?? "1.5")
	: 1;

const LCP_BUDGET = 3000 * PERF_MULTIPLIER;
const CLS_BUDGET = 0.15;
const INP_BUDGET = 200 * PERF_MULTIPLIER;
const LOAD_BUDGET = 3500 * PERF_MULTIPLIER;

test.describe("Performance budgets", { tag: ["@slow"] }, () => {
	test("homepage - LCP under budget", async ({ page }) => {
		await page.goto("/");

		const { startTime } = await measureLCP(page);

		expect(startTime, "LCP measurement was 0 - observer may not have captured it").toBeGreaterThan(
			0,
		);
		expect(startTime, `LCP was ${startTime}ms, budget is ${LCP_BUDGET}ms`).toBeLessThan(LCP_BUDGET);
	});

	test("homepage - le porteur du LCP est un candidat connu", async ({ page }) => {
		await page.goto("/");

		const lcp = await measureLCP(page);

		// Consigné dans le rapport Playwright : c'est la donnée qui tranche le
		// `preload` de la display, et elle change avec le viewport.
		const identity = `${lcp.tagName ?? "?"}${lcp.id ? `#${lcp.id}` : ""} — ${Math.round(lcp.size)} px² à ${Math.round(lcp.startTime)} ms${lcp.url ? ` (${lcp.url})` : ""}`;
		test.info().annotations.push({ type: "lcp-element", description: identity });

		test.skip(
			(await page.locator("#hero article").count()) === 0,
			"Catalogue vide : l'étal rend la carte de contact, la question du porteur ne se pose pas.",
		);

		// Les deux seuls candidats de l'étal : le `h1` (texte, hors frontière
		// Suspense) et la photo de la première carte. Tout autre porteur — un
		// squelette, le pied de page, le ruban d'une carte — est une régression :
		// il signifie que le premier écran a cessé de peindre ce qu'il annonce.
		expect(["H1", "IMG"], `Porteur inattendu du LCP : ${identity}`).toContain(lcp.tagName);
	});

	test("homepage - CLS under 0.15", async ({ page }) => {
		await page.goto("/");

		const cls = await measureCLS(page);

		expect(cls, `CLS was ${cls}, should be under ${CLS_BUDGET}`).toBeLessThan(CLS_BUDGET);
	});

	test("page produits - LCP under budget", async ({ page }) => {
		await page.goto("/produits");

		const { startTime } = await measureLCP(page);

		expect(startTime, "LCP measurement was 0 - observer may not have captured it").toBeGreaterThan(
			0,
		);
		expect(startTime, `LCP was ${startTime}ms, budget is ${LCP_BUDGET}ms`).toBeLessThan(LCP_BUDGET);
	});

	test("page produits - CLS under 0.15", async ({ page }) => {
		await page.goto("/produits");

		const cls = await measureCLS(page);

		expect(cls, `CLS was ${cls}, should be under ${CLS_BUDGET}`).toBeLessThan(CLS_BUDGET);
	});

	/**
	 * ⚠️ `/collections` ne rend plus de collection depuis le 2026-08-08 (les
	 * chapitres ont été supprimés, à refaire) : ce budget ne mesure plus que le
	 * bloc titre, et il passe donc trivialement. Le garder est délibéré — c'est le
	 * filet qui attendra le nouveau rendu.
	 *
	 * Ce qu'il a attrapé, et qui vaut pour la refonte : le repli d'un `<Suspense>`
	 * doit RECOUVRIR ce qu'il annonce. L'ancien réservait 112px de colonne texte
	 * pour ~202px de réel (description sur 4 lignes annoncée sur une, trait dessiné
	 * non réservé, `gap-3` là où le réel a des marges) — ~90px de décalage PAR
	 * BANDE au swap. Un test de parité statique compare des classes ; lui seul ne
	 * verrait pas un décalage venu d'ailleurs. Celui-ci mesure le résultat.
	 */
	test("page collections - CLS under 0.15", async ({ page }) => {
		await page.goto("/collections");

		const cls = await measureCLS(page);

		expect(cls, `CLS was ${cls}, should be under ${CLS_BUDGET}`).toBeLessThan(CLS_BUDGET);
	});

	test("homepage - INP under budget", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Set up INP observer BEFORE interaction
		await page.evaluate(() => {
			(window as unknown as { __inpEntries: number[] }).__inpEntries = [];
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					const duration = (entry as unknown as { duration: number }).duration;
					(window as unknown as { __inpEntries: number[] }).__inpEntries.push(duration);
				}
			});
			observer.observe({ type: "event", buffered: true });
			(window as unknown as { __inpObserver: PerformanceObserver }).__inpObserver = observer;
		});

		// Click an actual interactive element (button or link) instead of h1
		const interactiveElement = page.getByRole("link").first().or(page.getByRole("button").first());
		await interactiveElement.click({ noWaitAfter: true });

		// Collect INP after interaction
		const inp = await page.evaluate(() => {
			return new Promise<number>((resolve) => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						const win = window as unknown as {
							__inpObserver: PerformanceObserver;
							__inpEntries: number[];
						};
						win.__inpObserver.disconnect();
						const maxDuration = Math.max(0, ...win.__inpEntries);
						resolve(maxDuration);
					});
				});
			});
		});

		expect(inp, `INP was ${inp}ms, budget is ${INP_BUDGET}ms`).toBeLessThan(INP_BUDGET);
	});

	const criticalPages = ["/", "/produits", "/collections", "/connexion"];

	for (const route of criticalPages) {
		test(`${route} loads under budget`, async ({ page }) => {
			const startTime = Date.now();
			await page.goto(route);
			await page.waitForLoadState("domcontentloaded");
			const loadTime = Date.now() - startTime;

			expect(loadTime, `${route} took ${loadTime}ms, budget is ${LOAD_BUDGET}ms`).toBeLessThan(
				LOAD_BUDGET,
			);
		});
	}
});
