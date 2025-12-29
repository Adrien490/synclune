"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshRefunds } from "@/modules/refunds/hooks/use-refresh-refunds";

interface RefreshRefundsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshRefundsButton({
	className,
	variant = "outline",
}: RefreshRefundsButtonProps) {
	const { refresh, isPending } = useRefreshRefunds();

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
