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
	// Une seule vibration par intention. Le `light` au clic et le `success` à
	// l'arrivée des données sont séparés par un aller-retour serveur (bien au-delà
	// du cooldown de 80 ms) : c'étaient deux vibrations réelles pour un seul appui.
	// On garde celle qui porte l'information — « les données sont à jour ».
	const { refresh, isPending } = useRefreshDashboard({
		onSuccess: () => triggerHaptic("success"),
	});

	function handleRefresh() {
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
