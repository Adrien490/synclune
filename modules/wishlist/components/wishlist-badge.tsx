import { Badge } from "@/shared/components/ui/badge";

interface WishlistBadgeProps {
	count: number;
}

/**
 * Badge de la wishlist - 100% Server Component
 *
 * Architecture optimale Next.js 15+ :
 * - Aucune logique client (pas de JS envoyé au navigateur pour ce composant)
 * - Cache automatique via "use cache: private" dans getWishlistItemCount()
 * - Invalidation ciblée via updateTags() dans les server actions
 * - Le Router Cache gère la synchronisation automatiquement
 *
 * Flux après mutation (ex: ajout à la wishlist):
 * 1. Server Action → updateTags(['wishlist-count-user-123'])
 * 2. Router Cache invalide ce tag spécifique
 * 3. Navbar se re-render (car dans Suspense)
 * 4. getWishlistItemCount() → nouveau count
 * 5. WishlistBadge affiche la nouvelle valeur ✨
 */
export function WishlistBadge({ count }: WishlistBadgeProps) {
	// Validation défensive : protège contre undefined, null, NaN et valeurs négatives
	if (!count || count <= 0) {
		return null;
	}

	// Clamp à 99+ pour éviter débordement visuel
	const displayCount = count > 99 ? "99+" : count;

	return (
		<>
			{/* Annonce aria-live pour les lecteurs d'écran */}
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{count === 1
					? "1 article dans ta wishlist"
					: `${count} articles dans ta wishlist`}
			</div>

			<div className="absolute -top-1 -right-1">
				<Badge
					className="h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold bg-secondary text-secondary-foreground border-2 border-secondary shadow-lg animate-in zoom-in-50 duration-300"
					aria-hidden="true"
				>
					{displayCount}
				</Badge>
			</div>
		</>
	);
}
