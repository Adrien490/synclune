"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useRefreshDashboard } from "@/modules/dashboard/hooks/use-refresh-dashboard";

interface RefreshDashboardButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
	/** Render as a compact icon-only button visible on mobile (mobile header) */
	iconOnly?: boolean;
}

export function RefreshDashboardButton({
	className,
	variant = "outline",
	iconOnly = false,
}: RefreshDashboardButtonProps) {
	const { refresh, isPending } = useRefreshDashboard({
		onSuccess: () => triggerHaptic("success"),
	});

	function handleRefresh() {
		triggerHaptic("light");
		refresh();
	}

	return (
		<RefreshButton
			onRefresh={handleRefresh}
			isPending={isPending}
			label="Rafraîchir le tableau de bord"
			className={className}
			variant={variant}
			hideOnMobile={!iconOnly}
		/>
	);
}
