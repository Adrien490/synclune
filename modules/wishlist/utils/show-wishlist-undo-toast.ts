import { addToWishlist } from "@/modules/wishlist/actions/add-to-wishlist";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { ActionStatus } from "@/shared/types/server-action";
import { isMobileViewport, toast } from "@/shared/utils/toast";

interface ShowWishlistUndoToastOptions {
	productId: string;
	productTitle?: string;
	onRestored?: () => void;
}

/**
 * Feedback de retrait wishlist avec stratégie responsive.
 *
 * - **Desktop** : toast Sonner persistant 5s avec action « Annuler » inline +
 *   description guidante (pattern undo classique).
 * - **Mobile** : pastille `<MicroToast />` brève sans action — l'undo n'a pas
 *   de sens sur PDP (un tap re-toggle l'état). La page `/favoris` gère son
 *   propre undo via `WishlistListOptimisticContext` + `<Tombstone />` inline.
 *
 * Réutilisé entre `SwipeableWishlistItem` (desktop) et `WishlistButton`
 * (PDP via `enableUndoToast`).
 */
export function showWishlistUndoToast({
	productId,
	productTitle,
	onRestored,
}: ShowWishlistUndoToastOptions): void {
	if (isMobileViewport()) {
		toast.success(productTitle ? `« ${productTitle} » retiré` : "Retiré des favoris", {
			microVariant: "wishlist",
		});
		return;
	}

	const handleUndo = async () => {
		useBadgeCountsStore.getState().incrementWishlist();
		const fd = new FormData();
		fd.set("productId", productId);
		const result = await addToWishlist(undefined, fd);
		if (result.status === ActionStatus.SUCCESS) {
			toast.success(
				productTitle ? `« ${productTitle} » restauré dans vos favoris` : "Article restauré",
			);
			onRestored?.();
		} else {
			useBadgeCountsStore.getState().decrementWishlist();
			toast.error(result.message);
		}
	};

	toast.success(
		productTitle ? `« ${productTitle} » retiré de vos favoris` : "Article retiré de vos favoris",
		{
			description: "Vous pourrez toujours le retrouver dans nos créations.",
			duration: 5000,
			action: {
				label: "Annuler",
				onClick: handleUndo,
			},
		},
	);
}
