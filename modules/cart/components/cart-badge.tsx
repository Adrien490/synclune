import { Badge } from "@/shared/components/ui/badge";

interface CartBadgeProps {
	count: number;
}

/**
 * Badge du panier - 100% Server Component
 *
 * Architecture optimale Next.js 15+ :
 * - Aucune logique client (pas de JS envoyé au navigateur pour ce composant)
 * - Cache automatique via "use cache: private" dans getCartItemCount()
 * - Invalidation ciblée via updateTags() dans les server actions
 * - Le Router Cache gère la synchronisation automatiquement
 *
 * Flux après mutation (ex: ajout au panier):
 * 1. Server Action → updateTags(['cart-count-user-123'])
 * 2. Router Cache invalide ce tag spécifique
 * 3. Navbar se re-render (car dans Suspense)
 * 4. getCartItemCount() → nouveau count
 * 5. CartBadge affiche la nouvelle valeur ✨
 *
 * Pas de Zustand = Pas de complexité = Architecture simple et performante
 */
export function CartBadge({ count }: CartBadgeProps) {
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
					? "1 article dans votre panier"
					: `${count} articles dans votre panier`}
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
