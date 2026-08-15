"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshVariants } from "@/modules/variants/hooks/use-refresh-variants";
import { usePullToRefreshHandler } from "@/shared/hooks/use-pull-to-refresh-handler";

interface RefreshVariantsButtonProps {
	productId?: string;
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshVariantsButton({
	productId,
	className,
	variant = "outline",
}: RefreshVariantsButtonProps) {
	const { refresh, isPending } = useRefreshVariants({ productId });

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
