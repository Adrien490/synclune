import { addToWishlist } from "@/modules/wishlist/actions/add-to-wishlist";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { ActionStatus } from "@/shared/types/server-action";
import { isMobileViewport, toast } from "@/shared/utils/toast";

interface ShowWishlistUndoToastOptions {
	productId: string;
	productTitle?: string;
	onRestored?: () => void;
	/**
	 * Expose l'action « Annuler » dans le toast mobile.
	 *
	 * Réservé aux retraits déclenchés depuis la **grille** des favoris (swipe) :
	 * la carte disparaît, il n'y a donc plus rien à re-taper pour revenir en
	 * arrière. Sur la fiche produit, le cœur reste à l'écran et un second tap
	 * suffit — l'undo y serait redondant.
	 * @default false
	 */
	allowUndoOnMobile?: boolean;
}

/**
 * Feedback de retrait wishlist avec stratégie responsive.
 *
 * - **Desktop** : toast persistant 5s avec action « Annuler » inline +
 *   description guidante (pattern undo classique).
 * - **Mobile** : même toast en version brève (pas de description — le toaster
 *   mobile est `visibleToasts={1}` et bien plus étroit), avec l'undo seulement
 *   si `allowUndoOnMobile`.
 *
 * Réutilisé entre `SwipeableWishlistItem` (grille) et `WishlistButton`
 * (PDP via `enableUndoToast`).
 *
 * Resynchronisation après un undo réussi — deux stratégies, toutes deux
 * voulues :
 * - **Grille** (pas de `onRestored`) : `addToWishlist` pose le cookie, et une
 *   mutation de cookie dans une Server Action suffit à Next pour rafraîchir le
 *   router — `useOptimistic` se recale sur les données revalidées.
 * - **PDP** (`onRestored` → `router.refresh()`) : le cœur lit sa prop
 *   `isInWishlist` du rendu serveur ; le refresh explicite force la
 *   resynchronisation immédiate de cette prop sans attendre une navigation.
 */
export function showWishlistUndoToast({
	productId,
	productTitle,
	onRestored,
	allowUndoOnMobile = false,
}: ShowWishlistUndoToastOptions): void {
	const handleUndo = async () => {
		useBadgeCountsStore.getState().incrementWishlist();
		const fd = new FormData();
		fd.set("productId", productId);
		const result = await addToWishlist(undefined, fd);
		if (result.status === ActionStatus.SUCCESS) {
			toast.success(
				productTitle ? `« ${productTitle} » restauré dans tes favoris` : "Article restauré",
			);
			onRestored?.();
		} else {
			useBadgeCountsStore.getState().decrementWishlist();
			toast.error(result.message);
		}
	};

	if (isMobileViewport()) {
		toast.success(productTitle ? `« ${productTitle} » retiré` : "Retiré des favoris", {
			// Le toast mobile porte l'undo uniquement quand le retrait vient d'un
			// geste sur la grille : la carte a disparu, il n'y a plus rien à re-taper.
			...(allowUndoOnMobile ? { action: { label: "Annuler", onClick: handleUndo } } : {}),
		});
		return;
	}

	toast.success(
		productTitle ? `« ${productTitle} » retiré de tes favoris` : "Article retiré de tes favoris",
		{
			description: "Tu pourras toujours le retrouver dans nos créations.",
			duration: 5000,
			action: {
				label: "Annuler",
				onClick: handleUndo,
			},
		},
	);
}
