"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshDashboard } from "@/modules/dashboard/hooks/use-refresh-dashboard";

interface RefreshDashboardButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshDashboardButton({
	className,
	variant = "outline",
}: RefreshDashboardButtonProps) {
	const { refresh, isPending } = useRefreshDashboard();

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraichir le tableau de bord"
			className={className}
			variant={variant}
		/>
	);
}
