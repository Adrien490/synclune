"use client";

import { useRefreshReviews } from "@/modules/reviews/hooks/use-refresh-reviews";
import { RefreshButton } from "@/shared/components/refresh-button";
import { usePullToRefreshHandler } from "@/shared/hooks/use-pull-to-refresh-handler";

interface RefreshReviewsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshReviewsButton({
	className,
	variant = "outline",
}: RefreshReviewsButtonProps) {
	const { refresh, isPending } = useRefreshReviews();

	// Même chemin d'invalidation que le geste pull-to-refresh (Server Action →
	// `updateTag`) : sans ce branchement, PTR ne ferait qu'un `router.refresh()`
	// qui ne purge pas les entrées `use cache`.
	usePullToRefreshHandler(refresh);

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir avis"
			className={className}
			variant={variant}
		/>
	);
}
