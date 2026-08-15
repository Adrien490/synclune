import type { ReactElement } from "react";
import { ImageResponse } from "next/og";

import { OG_GENERIC_CARD_PNG_BASE64 } from "./generic-card.generated";

/** Taille canonique des cartes de partage — celle qu'exportent les 4 routes. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

const PNG_HEADERS = { "content-type": "image/png" } as const;

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
	} catch (error) {
		// Visible dans les logs serveur : c'est la SEULE trace de l'empoisonnement
		// du moteur (le crawler, lui, reçoit une carte valide).
		console.error("[og] rendu échoué — carte générique servie en repli :", error);
		return new Response(Buffer.from(OG_GENERIC_CARD_PNG_BASE64, "base64"), {
			headers: PNG_HEADERS,
		});
	}
}
