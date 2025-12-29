"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshSkus } from "@/modules/skus/hooks/use-refresh-skus";

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
