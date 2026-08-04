"use client";

import { TrashIcon } from "@phosphor-icons/react/ssr";

import { SwipeableCard } from "@/shared/components/swipeable-card";
import { useGestureHintOnce } from "@/shared/hooks/use-gesture-hint-once";
import { useRemoveFromWishlist } from "@/modules/wishlist/hooks/use-remove-from-wishlist";
import { useWishlistListOptimistic } from "@/modules/wishlist/contexts/wishlist-list-optimistic-context";
import { showWishlistUndoToast } from "@/modules/wishlist/utils/show-wishlist-undo-toast";

interface SwipeableWishlistItemProps {
	productId: string;
	itemName?: string;
	/** Premier item de la grille → joue le « peek nudge » de découvrabilité, une fois par appareil. */
	isFirst?: boolean;
	children: React.ReactNode;
}

/**
 * Wrapper de carte favoris ajoutant le swipe-to-remove sur appareil tactile.
 *
 * **Bâti sur `SwipeableCard`** (et non sur une implémentation propre) : la
 * primitive partagée apporte `touchcancel` — sans lui, un geste volé par l'OS
 * (appel entrant, geste système) laissait la carte figée en cours de swipe —,
 * un seuil adaptatif `min(80px, 30% de la largeur)`, le rubber-band, l'annonce
 * `aria-live` et l'opt-out `data-no-swipe`.
 *
 * **Le retrait est annulable.** Il s'applique optimistiquement via
 * `WishlistListOptimisticContext`, mais le geste ouvre un undo : la carte
 * disparaît de la grille, il n'y a donc plus rien à re-taper pour revenir en
 * arrière (contrairement au cœur de la fiche produit, où un second tap suffit).
 */
export function SwipeableWishlistItem({
	productId,
	itemName,
	isFirst = false,
	children,
}: SwipeableWishlistItemProps) {
	const wishlistListOptimistic = useWishlistListOptimistic();
	const peek = useGestureHintOnce("wishlist-swipe-remove", { enabled: isFirst });

	const { action } = useRemoveFromWishlist({
		onOptimisticRemove: (id) => wishlistListOptimistic?.onItemRemoved(id),
	});

	const handleRemove = () => {
		const formData = new FormData();
		formData.set("productId", productId);
		action(formData);
		// Pas de `onRestored` : le retrait optimiste passe par `useOptimistic`, qui se
		// resynchronise seul sur les données serveur revalidées après le ré-ajout.
		showWishlistUndoToast({
			productId,
			productTitle: itemName,
			allowUndoOnMobile: true,
		});
	};

	return (
		<SwipeableCard
			className="rounded-lg"
			peek={peek}
			leftAction={{
				children: <TrashIcon className="text-destructive-foreground size-5" aria-hidden="true" />,
				label: itemName ? `${itemName} retiré des favoris` : "Article retiré des favoris",
				onAction: handleRemove,
			}}
		>
			{children}
		</SwipeableCard>
	);
}
