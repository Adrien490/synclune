"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshCollections } from "@/modules/collections/hooks/use-refresh-collections";
import { usePullToRefreshHandler } from "@/shared/hooks/use-pull-to-refresh-handler";

interface RefreshCollectionsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshCollectionsButton({
	className,
	variant = "outline",
}: RefreshCollectionsButtonProps) {
	const { refresh, isPending } = useRefreshCollections();

	// Le geste pull-to-refresh partage le MÊME chemin d'invalidation que ce bouton
	// (Server Action → `updateTag`). Sans ce branchement, PTR ne faisait qu'un
	// `router.refresh()`, qui ne purge pas les entrées `use cache` : le geste
	// affichait un spinner et rendait les mêmes données.
	usePullToRefreshHandler(refresh);

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir collections"
			className={className}
			variant={variant}
		/>
	);
}
