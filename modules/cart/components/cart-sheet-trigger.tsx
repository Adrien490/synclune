"use client";

import { useSheet } from "@/shared/providers/sheet-store-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
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
	const { isOpen, open } = useSheet("cart");

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={open}
					className={cn("relative group", className)}
					aria-label="Ouvrir mon panier"
					aria-expanded={isOpen}
					aria-haspopup="dialog"
				>
					<ShoppingCart
						size={20}
						className="transition-transform duration-300 ease-out group-hover:scale-105"
						aria-hidden="true"
					/>
					<CartBadge />
				</button>
			</TooltipTrigger>
			<TooltipContent>Panier</TooltipContent>
		</Tooltip>
	);
}
