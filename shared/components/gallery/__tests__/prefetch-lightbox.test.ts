import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `prefetchLightbox` porte toute sa logique dans un drapeau au niveau MODULE —
 * invisible à la relecture, et jusqu'ici couvert par rien : les trois tests de
 * `zoom-button.test.tsx` qui l'exercent assertent uniquement « ne throw pas ».
 *
 * Le contrat qui compte est le `.catch()` : il **relâche** le drapeau. Sans lui,
 * une seule coupure réseau (ou un déploiement pendant la session) grillerait le
 * préchargement pour toute la durée de la page — et le premier tap mobile
 * retomberait sur le chunk froid que le correctif du 2026-08-04 visait
 * précisément.
 *
 * ⚠️ **Ce que ce fichier ne peut PAS observer, et pourquoi.** L'idempotence du
 * chemin NOMINAL (« un import réussi, puis plus jamais ») est indétectable ici :
 * si le drapeau était cassé, le second `import()` retomberait sur le module déjà
 * évalué et mis en cache par Vitest — même compteur, même absence d'effet. Les
 * deux branches sont littéralement indistinguables depuis l'extérieur. Le chemin
 * d'ÉCHEC, lui, l'est : un facteur de mock qui lève n'est pas mis en cache, donc
 * un ré-import le rejoue et le compteur bouge. Ne pas « compléter » ce fichier
 * par une assertion sur le cas nominal : elle passerait au vert dans les deux
 * sens, ce qui est pire que son absence.
 *
 * ⚠️ Même piège, écarté à l'écriture : « deux appels dans la même frame
 * n'importent qu'une fois » a l'air d'être le test du drapeau, et n'en est pas
 * un. Deux `import()` du MÊME specifier dans la même tick partagent la promesse
 * en vol — navigateur comme Vitest —, donc l'assertion reste verte après
 * suppression pure et simple de `lightboxPrefetched = true` (vérifié). Ce n'est
 * pas le drapeau qui évite le double téléchargement à cet instant-là, c'est le
 * runtime : le drapeau sert à ne PAS retenter après un succès, et à retenter
 * après un échec.
 */

const target = vi.hoisted(() => ({ imports: 0, fails: true }));

vi.mock("@/modules/media/components/media-lightbox", () => {
	target.imports += 1;
	if (target.fails) throw new Error("ChunkLoadError: Loading chunk failed");
	return { default: () => null };
});

/**
 * Laisse partir le report oisif PUIS la microtâche du `.catch()`.
 *
 * Deux sauts de tâche macro, pas un : le premier laisse tourner la tâche
 * planifiée par `scheduleWhenIdle` (qui lance l'`import()`), le second laisse le
 * `.catch()` remettre le drapeau. Un seul saut suffisait avant le report — il
 * rendait le test dépendant de l'ordre exact d'une file d'attente.
 */
async function flush() {
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

async function freshModule() {
	vi.resetModules();
	target.imports = 0;
	return (await import("../prefetch-lightbox")).prefetchLightbox;
}

describe("prefetchLightbox", () => {
	beforeEach(() => {
		target.fails = true;
	});

	it("ne lève jamais de façon synchrone, même quand le chunk échoue", async () => {
		const prefetchLightbox = await freshModule();

		expect(() => prefetchLightbox()).not.toThrow();

		await flush();
	});

	it("n'émet aucune rejection non gérée quand le chunk échoue", async () => {
		const onUnhandled = vi.fn();
		process.on("unhandledRejection", onUnhandled);

		const prefetchLightbox = await freshModule();
		prefetchLightbox();
		await flush();

		process.off("unhandledRejection", onUnhandled);
		expect(
			onUnhandled,
			"Un `void import()` nu remonterait une *unhandled rejection* à Sentry pour une\n" +
				"requête purement spéculative. Le `.catch()` n'est pas décoratif.",
		).not.toHaveBeenCalled();
	});

	it("relâche le drapeau après un échec : le geste suivant retente", async () => {
		const prefetchLightbox = await freshModule();

		prefetchLightbox();
		await flush();
		expect(target.imports).toBe(1);

		prefetchLightbox();
		await flush();

		expect(
			target.imports,
			"Le `.catch()` doit remettre `lightboxPrefetched` à `false`. Sans ça, un seul\n" +
				"échec réseau grille le préchargement pour TOUTE la durée de la page, et le\n" +
				"premier tap mobile retombe sur le chunk froid (cf. le correctif 2026-08-04).",
		).toBe(2);
	});

	it("retente autant de fois qu'il y a de gestes, tant que le chunk échoue", async () => {
		const prefetchLightbox = await freshModule();

		for (let i = 0; i < 3; i++) {
			prefetchLightbox();
			await flush();
		}

		expect(target.imports).toBe(3);
	});

	describe("report du travail spéculatif", () => {
		it("n'importe RIEN de façon synchrone : le geste ne paie pas la requête", async () => {
			const prefetchLightbox = await freshModule();

			prefetchLightbox();

			expect(
				target.imports,
				"L'`import()` doit être planifié, pas lancé dans le gestionnaire de\n" +
					"`pointerdown`. Il part au début de CHAQUE swipe, et concurrençait l'image LCP\n" +
					"pour un geste qui n'ouvre rien la plupart du temps.",
			).toBe(0);

			await flush();
			expect(target.imports).toBe(1);
		});

		it("passe par requestIdleCallback quand il existe, avec un plafond sous les 300 ms du double-tap", async () => {
			// Les deux paramètres sont déclarés : `options` est ce que l'assertion lit,
			// et un `vi.fn` mono-argument rendrait `calls[0][1]` inatteignable au type.
			const ric = vi.fn((cb: IdleRequestCallback, _options?: IdleRequestOptions) => {
				setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 0);
				return 1;
			});
			vi.stubGlobal("requestIdleCallback", ric);

			const prefetchLightbox = await freshModule();
			prefetchLightbox();
			await flush();

			expect(ric).toHaveBeenCalledTimes(1);
			const options = ric.mock.calls[0]![1];
			expect(
				options?.timeout,
				"Sans plafond, `requestIdleCallback` peut ne jamais tourner pendant un scroll —\n" +
					"et le chunk redeviendrait froid au premier tap. Le plafond doit rester SOUS le\n" +
					"`doubleTapDelay` de 300 ms de `GalleryPinchZoom`, qui décide l'ouverture.",
			).toBeLessThan(300);
			expect(target.imports).toBe(1);

			vi.unstubAllGlobals();
		});

		// Safari < 16.4 n'a pas `requestIdleCallback`, et Safari iOS pèse ~25 % du
		// trafic FR : le repli n'est pas théorique.
		it("se replie sur setTimeout quand requestIdleCallback est absent", async () => {
			vi.stubGlobal("requestIdleCallback", undefined);

			const prefetchLightbox = await freshModule();
			prefetchLightbox();
			await flush();

			expect(target.imports).toBe(1);

			vi.unstubAllGlobals();
		});
	});
});
