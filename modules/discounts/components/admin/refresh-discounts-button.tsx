"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshDiscounts } from "@/modules/discounts/hooks/use-refresh-discounts";

interface RefreshDiscountsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshDiscountsButton({
	className,
	variant = "outline",
}: RefreshDiscountsButtonProps) {
	const { refresh, isPending } = useRefreshDiscounts();

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir codes promo"
			className={className}
			variant={variant}
		/>
	);
}
