"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshRefunds } from "@/modules/refunds/hooks/use-refresh-refunds";
import { usePullToRefreshHandler } from "@/shared/hooks/use-pull-to-refresh-handler";

interface RefreshRefundsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshRefundsButton({
	className,
	variant = "outline",
}: RefreshRefundsButtonProps) {
	const { refresh, isPending } = useRefreshRefunds();

	// Le geste pull-to-refresh partage le MÊME chemin d'invalidation que ce bouton
	// (Server Action → `updateTag`). Sans ce branchement, PTR ne faisait qu'un
	// `router.refresh()`, qui ne purge pas les entrées `use cache` : le geste
	// affichait un spinner et rendait les mêmes données.
	usePullToRefreshHandler(refresh);

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir remboursements"
			className={className}
			variant={variant}
			hideOnMobile={false}
		/>
	);
}
