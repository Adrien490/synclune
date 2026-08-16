import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Budgets de performance mesurés via les APIs navigateur (LCP, CLS, INP).
 *
 * ⚠️ Les 4 anciens tests « X loads under budget » (chronométrage `Date.now()`
 * autour de `page.goto`) ont été SUPPRIMÉS le 2026-08-16 : sous workers
 * parallèles, ils mesuraient la charge de la machine de test (build de prod +
 * N navigateurs simultanés), pas la page — leurs échecs ne corrélaient à
 * aucune régression et leurs succès n'excluaient rien. Les budgets qui restent
 * (LCP/CLS) reposent sur les timings du navigateur, corrigés du multiplicateur
 * CI, et mesurent bien la page.
 */

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
 * Mesure le LCP en attendant qu'il se STABILISE.
 *
 * ⚠️ L'ancienne version résolvait au double-rAF qui suit `load`. Or `load` ne
 * finalise pas le LCP : le h1 de l'étal est en `font-display` (Winky Sans), et
 * tant que la police n'a pas peint, le plus grand candidat peut être un SPAN
 * de quelques milliers de px². Mesuré le 2026-08-16 : à `load` le porteur
 * était un `SPAN` de 3 978 px², à +3 s le `H1` de 59 352 px² — le test
 * échouait donc en dénonçant une régression du premier écran qui n'existait
 * pas (le porteur final est bien le h1, hypothèse du `preload` intacte).
 * On attend désormais 600 ms sans NOUVELLE entrée LCP, avec un plafond dur.
 */
async function measureLCP(page: Page): Promise<LcpMeasurement> {
	return page.evaluate(() => {
		return new Promise<LcpMeasurement>((resolve) => {
			// `element` est une référence DOM vivante : elle ne franchit pas la
			// frontière d'évaluation. On extrait ce qu'on veut savoir ici.
			let latest: LcpMeasurement = { startTime: 0, tagName: null, id: "", url: "", size: 0 };
			// Réarmé plus bas : chaque entrée repousse la fenêtre de calme.
			let onLcpEntry = () => {};

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
				onLcpEntry();
			});
			observer.observe({ type: "largest-contentful-paint", buffered: true });

			// Fenêtre de calme : chaque nouvelle entrée repousse l'échéance de
			// 600 ms ; un plafond de 5 s borne le cas pathologique (candidats qui
			// se succèdent sans fin). Le LCP retenu est donc le DERNIER stable,
			// pas le dernier connu au moment où `load` a sonné.
			let quietTimer: ReturnType<typeof setTimeout>;
			const settle = () => {
				observer.disconnect();
				clearTimeout(quietTimer);
				resolve(latest);
			};
			const bumpQuietWindow = () => {
				clearTimeout(quietTimer);
				quietTimer = setTimeout(settle, 600);
			};
			bumpQuietWindow();
			onLcpEntry = bumpQuietWindow;
			setTimeout(settle, 5_000);
		});
	});
}

declare global {
	interface Window {
		__cls?: { value: number; lastShiftAt: number };
	}
}

/**
 * Mesure le CLS en observant AU-DELÀ de `load`.
 *
 * ⚠️ L'ancienne version arrêtait l'observation au double-rAF qui suit `load` :
 * les décalages POST-hydratation (swap d'un repli `Suspense`, montée d'un
 * chunk lazy — précisément la famille de bugs que le commentaire du test
 * `/collections` documente) arrivaient après sa fenêtre et étaient invisibles.
 * On attend désormais une fenêtre de CALME : 1 s sans aucun layout-shift
 * après `load`, puis on lit le cumul.
 */
async function measureCLS(page: Page): Promise<number> {
	// `buffered: true` rattrape les shifts survenus depuis la navigation, même
	// si l'observateur est installé après.
	await page.evaluate(() => {
		const state = { value: 0, lastShiftAt: performance.now() };
		window.__cls = state;
		const observer = new PerformanceObserver((entryList) => {
			for (const entry of entryList.getEntries()) {
				const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
				if (!shift.hadRecentInput) {
					state.value += shift.value;
					state.lastShiftAt = performance.now();
				}
			}
		});
		observer.observe({ type: "layout-shift", buffered: true });
	});

	await page.waitForLoadState("load");

	// Fenêtre post-hydratation : on ne lit le cumul qu'après 1 s sans shift.
	await expect
		.poll(() => page.evaluate(() => performance.now() - (window.__cls?.lastShiftAt ?? 0)), {
			message: "La page continue de bouger : aucun calme d'1s après load",
			timeout: 15_000,
		})
		.toBeGreaterThan(1000);

	return page.evaluate(() => window.__cls?.value ?? 0);
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

test.describe("Performance budgets", { tag: ["@slow"] }, () => {
	test("homepage - LCP under budget", async ({ page }) => {
		await page.goto("/");

		const { startTime } = await measureLCP(page);

		expect(startTime, "LCP measurement was 0 - observer may not have captured it").toBeGreaterThan(
			0,
		);
		expect(startTime, `LCP was ${startTime}ms, budget is ${LCP_BUDGET}ms`).toBeLessThan(LCP_BUDGET);
	});

	test("homepage - le porteur du LCP est un candidat connu", async ({ page, browserName }) => {
		// Le PORTEUR (pas le budget) n'est asserté que sur Chromium : Firefox
		// élit le placeholder de bruit (DIV à background-image data:svg) comme
		// candidat LCP là où Chromium retient la photo — divergence de moteur,
		// pas une régression du premier écran.
		test.skip(browserName !== "chromium", "Élection du porteur LCP spécifique au moteur");
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

	test("homepage - INP under budget", async ({ page, browserName }) => {
		// L'Event Timing API avec `interactionId` n'existe que sur Chromium —
		// ailleurs, l'observateur ne produit rien et la mesure vaudrait toujours 0
		// (vert trivial, exactement le défaut corrigé ci-dessous).
		test.skip(browserName !== "chromium", "Event Timing (interactionId) — Chromium uniquement");
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Set up INP observer BEFORE interaction.
		// ⚠️ Sans `durationThreshold` ni filtre `interactionId`, l'observateur ne
		// remontait AUCUNE entrée d'interaction (seuil par défaut : 104 ms) et la
		// mesure valait toujours 0 : le budget passait quel que soit le code.
		await page.evaluate(() => {
			(window as unknown as { __inpEntries: number[] }).__inpEntries = [];
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					const timing = entry as PerformanceEntry & {
						duration: number;
						interactionId?: number;
					};
					// Seules les entrées portant un interactionId non nul sont des
					// interactions utilisateur (le reste : hover, scroll passif…).
					if ((timing.interactionId ?? 0) > 0) {
						(window as unknown as { __inpEntries: number[] }).__inpEntries.push(timing.duration);
					}
				}
			});
			// `durationThreshold` est absent de `PerformanceObserverInit` dans les lib
			// DOM de TypeScript, mais fait bien partie de l'Event Timing API — sans
			// lui le seuil par défaut (~104 ms) vide la mesure.
			observer.observe({
				type: "event",
				buffered: true,
				durationThreshold: 16,
			} as PerformanceObserverInit & { durationThreshold: number });
			(window as unknown as { __inpObserver: PerformanceObserver }).__inpObserver = observer;
		});

		// Click an actual interactive element (button or link) instead of h1.
		// ⚠️ `a.first().or(b.first())` résout les DEUX premiers → strict violation,
		// et le premier lien du DOM est le skip link sr-only (1×1 clippé,
		// « visible » pour Playwright mais hors viewport au clic).
		const interactiveElement = page
			.getByRole("link")
			.filter({ visible: true })
			.filter({ hasNotText: /Aller au contenu principal/i })
			.first();
		await interactiveElement.click({ noWaitAfter: true });

		// Collect INP after interaction. 0 = aucune interaction n'a dépassé le
		// seuil de 16 ms — c'est un résultat honnête, pas une absence de mesure.
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

	/*
	 * Supprimés le 2026-08-16 : les 4 budgets « <route> loads under budget »
	 * (`Date.now()` autour de `page.goto` + `domcontentloaded`). Sous workers
	 * parallèles, cette horloge murale mesure la contention de la machine (CPU
	 * partagé entre navigateurs et serveur de prod), pas la page : mêmes commits,
	 * écarts ×3 d'un run à l'autre. Les métriques navigateur ci-dessus (LCP par
	 * PerformanceObserver) couvrent le même risque sans ce bruit.
	 */
});
