"use client";

import { CountBadge } from "@/shared/components/ui/count-badge";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

/**
 * Badge panier — Client Component avec optimistic UI.
 *
 * Lit le count depuis le store Zustand pour affichage instantané. Le store est
 * hydraté par BadgeCountsStoreProvider avec la valeur serveur, puis mis à jour
 * de façon optimistic par useAddToCart, useRemoveFromCart, etc.
 *
 * Le `cartBump` publié par `adjustCart` déclenche un flash "+N" éphémère
 * au-dessus du badge lors d'un ajout.
 */
export function CartBadge() {
	const count = useBadgeCountsStore((state) => state.cartCount);
	const bump = useBadgeCountsStore((state) => state.cartBump);

	return (
		<CountBadge
			count={count}
			size="lg"
			singularLabel="article dans ton panier"
			pluralLabel="articles dans ton panier"
			bumpKey={bump?.key}
			bumpDelta={bump?.delta}
		/>
	);
}
