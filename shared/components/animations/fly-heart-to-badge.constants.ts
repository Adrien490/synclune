/**
 * Event personnalisé pour déclencher l'animation « mini-heart qui vole du bouton
 * Wishlist vers le badge navbar ». Dispatché depuis `useWishlistToggle` au moment
 * de l'add optimistic, écouté par `<FlyHeartToBadgeLayer />` monté globalement.
 */
export const FLY_HEART_EVENT = "wishlist:fly-to-badge" as const;

/**
 * Sélecteur DOM utilisé par le layer pour trouver le badge cible. Le composant
 * `<WishlistBadge />` doit poser cet attribut sur son root.
 */
export const WISHLIST_BADGE_DATA_ATTR = "data-wishlist-badge";

export interface FlyHeartEventDetail {
	/**
	 * Position absolue du bouton déclencheur dans la viewport (résultat d'un
	 * `getBoundingClientRect()` côté composant). Sérialisé en POJO pour éviter
	 * de passer un `DOMRect` muable à travers l'event bus.
	 */
	fromRect: {
		top: number;
		left: number;
		width: number;
		height: number;
	};
}
