import type { Page } from "@playwright/test";

/**
 * Attend qu'au moins un `<button>` dont le nom (aria-label, sinon texte)
 * matche `namePattern` soit HYDRATÉ — c'est-à-dire que React ait posé ses
 * props (et donc ses listeners) sur le nœud DOM.
 *
 * Pourquoi c'est nécessaire : le SSR peint les boutons AVANT que React ne
 * pose ses listeners — un `click()` d'avant hydratation est AVALÉ (le bouton
 * est dans le DOM, rien ne se passe, aucune erreur). `networkidle` n'est pas
 * une alternative : il ne se résout jamais sous `next dev`.
 *
 * ⚠️ Cette sonde lit des INTERNALS React non contractuels : les clés
 * `__reactProps$…` que react-dom écrit sur chaque nœud hydraté. Rien ne
 * garantit leur survie d'une version à l'autre — À RE-VÉRIFIER À CHAQUE BUMP
 * REACT. Mode de défaillance si la clé disparaît : le `waitForFunction` ne
 * résout plus jamais et les specs échouent au timeout (bruyamment, pas en
 * silence). Cette implémentation était dupliquée dans 3 fichiers avant d'être
 * centralisée ici (audit 2026-08-16).
 */
export async function waitForHydratedButton(page: Page, namePattern: RegExp): Promise<void> {
	await page.waitForFunction(
		({ source, flags }) => {
			const pattern = new RegExp(source, flags);
			const buttons = [...document.querySelectorAll("button")].filter((b) =>
				pattern.test(b.getAttribute("aria-label") ?? b.textContent),
			);
			return (
				buttons.length > 0 &&
				buttons.some((b) => Object.keys(b).some((key) => key.startsWith("__reactProps")))
			);
		},
		{ source: namePattern.source, flags: namePattern.flags },
	);
}
