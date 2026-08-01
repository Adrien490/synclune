"use client";

import { CART_TARGET_ATTR } from "@/modules/cart/lib/fly-to-cart";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { CartBadge } from "./cart-badge";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface CartSheetTriggerProps {
	className?: string;
	ref?: React.Ref<HTMLButtonElement>;
}

/**
 * Bouton trigger pour ouvrir le cart sheet
 */
export function CartSheetTrigger({ className, ref }: CartSheetTriggerProps) {
	const { isOpen, open } = useSheet("cart");

	return (
		<button
			ref={ref}
			type="button"
			onClick={open}
			className={cn("group focus-ring relative", className)}
			aria-label="Ouvrir mon panier"
			aria-expanded={isOpen}
			aria-haspopup="dialog"
			{...{ [CART_TARGET_ATTR]: "" }}
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
