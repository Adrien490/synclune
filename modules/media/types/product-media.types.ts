/**
 * Média produit côté galerie — schéma lean (lot 2) : le média vit sur le
 * PRODUIT ({ url, alt, type, position }), plus sur la variante.
 */
export type ProductMedia = {
	id: string;
	url: string;
	alt: string;
	type: "IMAGE" | "VIDEO";
	/** Position dans la galerie (0 = média principal). */
	position?: number;
	/** Flag interne gallery-builder : alt défini en base (non regénéré). */
	_hasCustomAlt?: boolean;
};
