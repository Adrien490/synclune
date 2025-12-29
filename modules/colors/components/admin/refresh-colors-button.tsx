"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshColors } from "@/modules/colors/hooks/use-refresh-colors";

interface RefreshColorsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshColorsButton({
	className,
	variant = "outline",
}: RefreshColorsButtonProps) {
	const { refresh, isPending } = useRefreshColors();

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir couleurs"
			className={className}
			variant={variant}
		/>
	);
}
