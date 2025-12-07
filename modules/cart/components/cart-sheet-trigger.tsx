"use client";

import { useSheet } from "@/shared/providers/sheet-store-provider";
import { CartBadge } from "./cart-badge";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface CartSheetTriggerProps {
	className?: string;
}

/**
 * Bouton trigger pour ouvrir le cart sheet
 * Remplace le Link vers /panier dans la navbar
 */
export function CartSheetTrigger({ className }: CartSheetTriggerProps) {
	const { open } = useSheet("cart");

	return (
		<button
			type="button"
			onClick={open}
			className={cn(
				"relative group",
				className
			)}
			aria-label="Ouvrir mon panier"
		>
			<ShoppingCart
				size={20}
				className="transition-transform duration-300 ease-out group-hover:scale-105"
				aria-hidden="true"
			/>
			<CartBadge />
		</button>
	);
}
