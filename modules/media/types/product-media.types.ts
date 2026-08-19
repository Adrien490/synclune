/**
 * Média produit côté galerie — schéma lean : le média vit sur le PRODUIT
 * ({ url, alt, type, blurDataUrl, position }), plus sur la variante.
 */

import type { MediaType } from "@/app/generated/prisma/client";
export type ProductMedia = {
	id: string;
	url: string;
	alt: string;
	type: MediaType;
	/** Placeholder blur persisté (`ProductMedia.blurDataUrl`), absent en legacy. */
	blurDataUrl?: string | null;
	/** Position dans la galerie (0 = média principal). */
	position?: number;
	/** Flag interne gallery-builder : alt défini en base (non regénéré). */
	_hasCustomAlt?: boolean;
};
