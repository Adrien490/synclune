"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshSkus } from "@/modules/skus/hooks/use-refresh-skus";
import { usePullToRefreshHandler } from "@/shared/hooks/use-pull-to-refresh-handler";

interface RefreshSkusButtonProps {
	productId?: string;
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshSkusButton({
	productId,
	className,
	variant = "outline",
}: RefreshSkusButtonProps) {
	const { refresh, isPending } = useRefreshSkus({ productId });

	// Le geste pull-to-refresh partage le MÊME chemin d'invalidation que ce bouton
	// (Server Action → `updateTag`). Sans ce branchement, PTR ne faisait qu'un
	// `router.refresh()`, qui ne purge pas les entrées `use cache` : le geste
	// affichait un spinner et rendait les mêmes données.
	usePullToRefreshHandler(refresh);

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir variantes"
			className={className}
			variant={variant}
		/>
	);
}
