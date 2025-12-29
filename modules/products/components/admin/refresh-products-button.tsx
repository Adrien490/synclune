"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshProducts } from "@/modules/products/hooks/use-refresh-products";

interface RefreshProductsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshProductsButton({
	className,
	variant = "outline",
}: RefreshProductsButtonProps) {
	const { refresh, isPending } = useRefreshProducts();

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir produits"
			className={className}
			variant={variant}
		/>
	);
}
