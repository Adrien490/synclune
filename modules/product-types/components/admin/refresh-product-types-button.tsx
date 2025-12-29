"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshProductTypes } from "@/modules/product-types/hooks/use-refresh-product-types";

interface RefreshProductTypesButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshProductTypesButton({
	className,
	variant = "outline",
}: RefreshProductTypesButtonProps) {
	const { refresh, isPending } = useRefreshProductTypes();

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir types de produits"
			className={className}
			variant={variant}
		/>
	);
}
