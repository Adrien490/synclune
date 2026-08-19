/**
 * Résolution de la source affichable d'un média pour `next/image`.
 *
 * (`getVideoMimeType` a déménagé dans `media-type-detection.ts` — la détection
 * par URL vit désormais dans UN seul fichier, avec UN seul parseur d'extension.)
 */

import type { MediaType } from "@/app/generated/prisma/client";

/**
 * Résout la source affichable d'un média pour un rendu `next/image`.
 *
 * Schéma lean : plus de poster (`thumbnailUrl`) en base. Une vidéo n'est pas
 * décodable par l'optimiseur d'images — retourner l'URL `.mp4` produirait une
 * vignette cassée + une transformation facturée pour rien : on retourne `null`
 * afin que l'appelant affiche un placeholder (cf. `gallery/thumbnail.tsx`).
 *
 * @returns L'URL à passer à `<Image src>`, ou `null` si aucun rendu image n'est possible
 */
export function resolveMediaThumbSrc(media: { url: string; type: MediaType }): string | null {
	if (media.type === "VIDEO") {
		return null;
	}
	return media.url;
}
