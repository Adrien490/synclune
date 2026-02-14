"use client";

import { useOptimistic, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import ScrollFade from "@/shared/components/scroll-fade";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingBag } from "lucide-react";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import Link from "next/link";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { CartSheetItemRow } from "./cart-sheet-item-row";
import { RemoveCartItemAlertDialog } from "./remove-cart-item-alert-dialog";
import { CartPriceChangeAlert } from "./cart-price-change-alert";
import { CartSheetFooter } from "./cart-sheet-footer";
import type { GetCartReturn } from "../types/cart.types";
import { hasCartItemIssue, getCartItemSubtotal } from "../services/cart-item.service";
import {
	CartOptimisticContext,
	type CartOptimisticAction,
} from "../contexts/cart-optimistic-context";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

// Extracted outside component to avoid recreation on each render
function cartReducer(
	state: GetCartReturn,
	action: CartOptimisticAction
): GetCartReturn {
	if (!state) return state;
	switch (action.type) {
		case "remove":
			return {
				...state,
				items: state.items.filter((item) => item.id !== action.itemId),
			};
		case "updateQuantity":
			return {
				...state,
				items: state.items.map((item) =>
					item.id === action.itemId
						? { ...item, quantity: action.quantity }
						: item
				),
			};
		default: {
			const _exhaustiveCheck: never = action;
			return _exhaustiveCheck;
		}
	}
}

interface CartSheetProps {
	cart: GetCartReturn;
}

export function CartSheet({ cart }: CartSheetProps) {
	const { isOpen, close } = useSheet("cart");
	const shouldReduceMotion = useReducedMotion();
	const [isPending, startTransition] = useTransition();

	// Optimistic state for items list and quantities
	const [optimisticCart, updateOptimisticCart] = useOptimistic(
		cart,
		cartReducer
	);

	const hasItems = optimisticCart && optimisticCart.items.length > 0;

	// Summary calculations based on optimistic state
	const totalItems = hasItems
		? optimisticCart.items.reduce((sum, item) => sum + item.quantity, 0)
		: 0;

	const subtotal = hasItems
		? optimisticCart.items.reduce((sum, item) => sum + getCartItemSubtotal(item), 0)
		: 0;

	const itemsWithIssues = hasItems
		? optimisticCart.items.filter(hasCartItemIssue)
		: [];
	const hasStockIssues = itemsWithIssues.length > 0;

	// Optimistic context value
	const cartOptimisticValue = {
		updateOptimisticCart,
		isPending,
		startTransition,
	};

	return (
		<CartOptimisticContext.Provider value={cartOptimisticValue}>
			<Sheet direction="right" open={isOpen} onOpenChange={(open) => !open && close()}>
				<SheetContent
					className="w-full sm:max-w-lg flex flex-col p-0 gap-0"
				>
					<SheetHeader className="px-6 py-4 border-b shrink-0">
						<SheetTitle>
							Mon panier
							{hasItems && (
								<span
									className="transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50"
								>
									{" "}({totalItems})
								</span>
							)}
						</SheetTitle>
						<SheetDescription className="sr-only">
							Encore quelques étapes pour passer commande 😊
						</SheetDescription>
					</SheetHeader>

					{/* Screen reader live region */}
					<div aria-live="polite" aria-atomic="true" className="sr-only">
						{hasItems
							? `${totalItems} article${totalItems > 1 ? "s" : ""} dans le panier, sous-total ${formatEuro(subtotal)}`
							: "Panier vide"}
					</div>

					{!hasItems ? (
						<div className="flex-1 min-h-0 flex flex-col px-6 py-8" role="status">
							<Empty variant="borderless" className="flex-1">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<ShoppingBag className="size-6" />
									</EmptyMedia>
									<EmptyTitle>Ton panier est vide !</EmptyTitle>
								</EmptyHeader>
								<EmptyContent>
									<p className="text-muted-foreground max-w-70">
										Chaque bijou est une pièce unique, fabriquée à la main avec amour. Trouve celui qui te correspond !
									</p>
									<Button
										asChild
										size="lg"
										className="w-full max-w-xs group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
									>
										<Link href="/produits" onClick={close}>Découvrir la boutique</Link>
									</Button>
									<Button
										asChild
										variant="link"
										className="text-muted-foreground group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
									>
										<Link href="/collections" onClick={close}>Voir les collections</Link>
									</Button>
								</EmptyContent>
							</Empty>
						</div>
					) : (
						<>
							{/* Critical alerts - always visible */}
							{hasStockIssues && (
								<div
									id="stock-issues-alert"
									className="px-6 py-2.5 bg-destructive/10 border-b border-destructive/20 shrink-0"
									role="alert"
									aria-label="Problèmes de stock dans le panier"
								>
									<p className="text-xs text-destructive font-medium">
										Ajuste ton panier pour continuer
									</p>
									<ul className="mt-1 space-y-0.5 text-[11px] text-destructive/80">
										{itemsWithIssues.map((item) => (
											<li key={item.id} className="flex items-center gap-1">
												<span aria-hidden="true">•</span>
												<span className="line-clamp-1">
													{item.sku.product.title}
													{item.sku.inventory < item.quantity && " (rupture)"}
													{(!item.sku.isActive ||
														item.sku.product.status !== "PUBLIC") &&
														" (indisponible)"}
												</span>
											</li>
										))}
									</ul>
								</div>
							)}

							{optimisticCart && (
								<div className="shrink-0">
									<CartPriceChangeAlert items={optimisticCart.items} />
								</div>
							)}

							<div className="flex-1 min-h-0">
								<ScrollFade
									axis="vertical"
									className="h-full"
									hideScrollbar={false}
								>
									<div className="px-6 py-4 space-y-3">
										<AnimatePresence mode="popLayout" initial={false}>
											{optimisticCart?.items.map((item) => (
												<motion.div
													key={item.id}
													layout
													initial={{ opacity: 0, height: 0, scale: 0.95 }}
													animate={{ opacity: 1, height: "auto", scale: 1 }}
													exit={{ opacity: 0, height: 0, scale: 0.95 }}
													transition={
														shouldReduceMotion
															? { duration: 0 }
															: MOTION_CONFIG.spring.list
													}
													className="overflow-hidden origin-top"
												>
													<CartSheetItemRow item={item} onClose={close} />
												</motion.div>
											))}
										</AnimatePresence>
									</div>
								</ScrollFade>
							</div>

							<CartSheetFooter
								totalItems={totalItems}
								subtotal={subtotal}
								isPending={isPending}
								hasStockIssues={hasStockIssues}
								onClose={close}
							/>
						</>
					)}
				</SheetContent>
			</Sheet>

			<RemoveCartItemAlertDialog />
		</CartOptimisticContext.Provider>
	);
}
