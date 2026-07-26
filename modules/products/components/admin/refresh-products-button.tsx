"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshProducts } from "@/modules/products/hooks/use-refresh-products";
import { usePullToRefreshHandler } from "@/shared/hooks/use-pull-to-refresh-handler";

interface RefreshProductsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshProductsButton({
	className,
	variant = "outline",
}: RefreshProductsButtonProps) {
	const { refresh, isPending } = useRefreshProducts();

	// Le geste pull-to-refresh partage le MÊME chemin d'invalidation que ce bouton
	// (Server Action → `updateTag`). Sans ce branchement, PTR ne faisait qu'un
	// `router.refresh()`, qui ne purge pas les entrées `use cache` : le geste
	// affichait un spinner et rendait les mêmes données.
	usePullToRefreshHandler(refresh);

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir produits"
			className={className}
			variant={variant}
		/>
	);
}
