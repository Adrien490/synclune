"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshCollections } from "@/modules/collections/hooks/use-refresh-collections";

interface RefreshCollectionsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshCollectionsButton({
	className,
	variant = "outline",
}: RefreshCollectionsButtonProps) {
	const { refresh, isPending } = useRefreshCollections();

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
