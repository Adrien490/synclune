import { z } from "zod";

/**
 * Longueur maximale d'un placeholder blur.
 *
 * La valeur stockée est une data URL COMPLÈTE (et non le hash brut de ~35 caractères) :
 * PNG ThumbHash côté serveur, JPEG 8×8 canvas ou WebP 10×10 ffmpeg pour un poster
 * vidéo. Quelques Ko suffisent largement.
 */
const BLUR_DATA_URL_MAX_LENGTH = 10_000;

/**
 * SSOT de validation d'un `blurDataUrl` — les trois chemins d'écriture
 * (produits, SKUs, avis) divergeaient : `max(10000)` sans contrôle de format,
 * `startsWith("data:image/") + max(5000)`, et aucune contrainte du tout.
 * Cette valeur est injectée telle quelle dans l'attribut `blurDataURL` de
 * `next/image` : le préfixe doit être vérifié.
 */
export const blurDataUrlSchema = z
	.string()
	.max(BLUR_DATA_URL_MAX_LENGTH, {
		message: `Le placeholder ne doit pas dépasser ${BLUR_DATA_URL_MAX_LENGTH} caractères`,
	})
	.startsWith("data:image/", {
		message: "Le placeholder doit être une data URL d'image",
	});

/**
 * Dimension intrinsèque d'un média (px). Entier strictement positif, borné pour
 * rester coherent avec la garde image-bomb (`MAX_IMAGE_PIXELS` = 50 MP).
 */
export const mediaDimensionSchema = z.number().int().positive().max(50_000);

/**
 * ⚠️ Les schémas de média COMPOSÉS (`baseMediaSchema`, `imageMediaSchema`,
 * `nullableImageMediaSchema`) ont été retirés (audit Zod 2026-07-31) : zéro
 * consommateur en production, alors qu'ils dupliquaient intégralement
 * `modules/products/schemas/product-media.schemas.ts` — le seul réellement branché
 * (products + skus) — avec des nuances divergentes (`altText` nullable ici,
 * simplement optional là-bas). Deux SSOT concurrentes dont une morte, et c'est la
 * morte qui revendiquait le titre en commentaire.
 *
 * Ce fichier ne garde donc que les BRIQUES effectivement partagées ci-dessus
 * (`blurDataUrlSchema`, `mediaDimensionSchema`), consommées par
 * `product-media.schemas.ts`. Un futur schéma de média composé s'ajoute là-bas.
 */
