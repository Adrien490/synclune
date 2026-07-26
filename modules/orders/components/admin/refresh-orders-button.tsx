"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshOrders } from "@/modules/orders/hooks/use-refresh-orders";
import { usePullToRefreshHandler } from "@/shared/hooks/use-pull-to-refresh-handler";

interface RefreshOrdersButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshOrdersButton({ className, variant = "outline" }: RefreshOrdersButtonProps) {
	const { refresh, isPending } = useRefreshOrders();

	// Le geste pull-to-refresh partage le MÊME chemin d'invalidation que ce bouton
	// (Server Action → `updateTag`). Sans ce branchement, PTR ne faisait qu'un
	// `router.refresh()`, qui ne purge pas les entrées `use cache` : le geste
	// affichait un spinner et rendait les mêmes données.
	usePullToRefreshHandler(refresh);

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir commandes"
			className={className}
			variant={variant}
		/>
	);
}
