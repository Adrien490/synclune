"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshOrders } from "@/modules/orders/hooks/use-refresh-orders";

interface RefreshOrdersButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshOrdersButton({
	className,
	variant = "outline",
}: RefreshOrdersButtonProps) {
	const { refresh, isPending } = useRefreshOrders();

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
