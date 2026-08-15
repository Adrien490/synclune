import type { ReactElement } from "react";
import { ImageResponse } from "next/og";

import { OgShell } from "./og-shell";

/** Taille canonique des cartes de partage — celle qu'exportent les 4 routes. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

const PNG_HEADERS = { "content-type": "image/png" } as const;

/**
 * La carte générique, rendue UNE fois au chargement du module — pendant que le
 * moteur est encore sain — et gardée en buffer pour servir de repli.
 */
const genericCard: Promise<ArrayBuffer | null> = (async () => {
	try {
		const image = new ImageResponse(
			<OgShell align="center" signature>
				<div style={{ display: "flex", fontSize: 64, fontWeight: 600 }}>Synclune</div>
			</OgShell>,
			{ ...OG_SIZE },
		);
		return await image.arrayBuffer();
	} catch {
		return null;
	}
})();

/**
 * Rend une carte OG en BUFFER dans le handler, avec repli sur la carte
 * générique.
 *
 * Pourquoi ne pas retourner l'`ImageResponse` directement : son rendu
 * (satori + resvg-wasm) ne s'exécute qu'au STREAMING de la réponse — hors de
 * portée de tout try/catch du handler. Or le moteur peut être HORS SERVICE
 * pour tout le process (constaté au lot 7 : sous la charge d'une longue suite
 * e2e, une instance wasm avortée empoisonne tous les rendus suivants —
 * « Input buffer contains unsupported image format » → réponse VIDE,
 * « failed to pipe response », jusqu'au redémarrage). En pré-rendant ici,
 * l'échec est attrapé et la route sert la carte générique (pré-chauffée au
 * chargement du module) au lieu de fermer la connexion au crawler.
 */
export async function renderOgImage(element: ReactElement): Promise<Response> {
	try {
		const image = new ImageResponse(element, { ...OG_SIZE });
		return new Response(await image.arrayBuffer(), { headers: PNG_HEADERS });
	} catch {
		const fallback = await genericCard;
		if (fallback) {
			return new Response(fallback.slice(0), { headers: PNG_HEADERS });
		}
		return new Response(null, { status: 503 });
	}
}
