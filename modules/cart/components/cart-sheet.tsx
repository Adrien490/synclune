"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
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
import {
	hasCartItemIssue,
	getCartItemSubtotal,
	getCartItemIssueLabel,
} from "../services/cart-item.service";
import { CartOptimisticContext } from "../contexts/cart-optimistic-context";
import { cartReducer } from "../services/cart-reducer.service";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { CART_TARGET_ATTR } from "../lib/fly-to-cart";

interface CartSheetProps {
	cart: GetCartReturn;
	recommendations?: React.ReactNode;
}

export function CartSheet({ cart, recommendations }: CartSheetProps) {
	const { isOpen, close } = useSheet("cart");
	const shouldReduceMotion = useReducedMotion();
	const [isPending, startTransition] = useTransition();
	const triggerRef = useRef<HTMLElement | null>(null);

	// Optimistic state for items list and quantities
	const [optimisticCart, updateOptimisticCart] = useOptimistic(cart, cartReducer);

	const hasItems = optimisticCart && optimisticCart.items.length > 0;

	// Summary calculations based on optimistic state
	const totalItems = hasItems
		? optimisticCart.items.reduce((sum, item) => sum + item.quantity, 0)
		: 0;

	const subtotal = hasItems
		? optimisticCart.items.reduce((sum, item) => sum + getCartItemSubtotal(item), 0)
		: 0;

	const itemsWithIssues = hasItems ? optimisticCart.items.filter(hasCartItemIssue) : [];
	const hasStockIssues = itemsWithIssues.length > 0;

	// Optimistic context value
	const cartOptimisticValue = {
		updateOptimisticCart,
		isPending,
		startTransition,
	};

	return (
		<CartOptimisticContext.Provider value={cartOptimisticValue}>
			<Sheet
				direction="right"
				open={isOpen}
				onOpenChange={(open) => {
					if (open) {
						// Capture the trigger element for focus return
						triggerRef.current = document.querySelector<HTMLElement>(`[${CART_TARGET_ATTR}]`);
					} else {
						close();
						// Return focus to trigger after sheet close animation
						requestAnimationFrame(() => triggerRef.current?.focus());
					}
				}}
			>
				<SheetContent
					className="group/sheet flex w-full flex-col gap-0 p-0 sm:max-w-lg"
					data-pending={isPending ? "" : undefined}
					aria-busy={isPending}
				>
					<SheetHeader className="shrink-0 border-b px-6 py-4">
						<SheetTitle>
							Mon panier
							{hasItems && (
								<span className="transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50">
									{" "}
									({totalItems})
								</span>
							)}
						</SheetTitle>
						<SheetDescription className="sr-only">
							Gérez les articles de votre panier
						</SheetDescription>
					</SheetHeader>

					{/* Screen reader live region */}
					<div aria-live="polite" aria-atomic="true" className="sr-only">
						{hasItems
							? `${totalItems} article${totalItems > 1 ? "s" : ""} dans le panier, sous-total ${formatEuro(subtotal)}`
							: "Panier vide"}
					</div>

					{!hasItems ? (
						<div className="flex min-h-0 flex-1 flex-col px-6 py-8" role="status">
							<Empty variant="borderless" className="flex-1">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<ShoppingBag className="size-6" />
									</EmptyMedia>
									<EmptyTitle>Votre panier est vide !</EmptyTitle>
								</EmptyHeader>
								<EmptyContent>
									<p className="text-muted-foreground max-w-70">
										Chaque bijou est une pièce unique, fabriquée à la main avec amour. Trouvez celui
										qui vous correspond !
									</p>
									<Button
										asChild
										size="lg"
										className="w-full max-w-xs group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
									>
										<Link href="/produits" onClick={close}>
											Découvrir la boutique
										</Link>
									</Button>
									<Button
										asChild
										variant="link"
										className="text-muted-foreground group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
									>
										<Link href="/collections" onClick={close}>
											Voir les collections
										</Link>
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
									className="bg-destructive/10 border-destructive/20 shrink-0 border-b px-6 py-2.5"
									role="alert"
									aria-label="Problèmes de stock dans le panier"
								>
									<p className="text-destructive text-xs font-medium">
										Ajustez votre panier pour continuer
									</p>
									<ul className="text-destructive/80 mt-1 space-y-0.5 text-[11px]">
										{itemsWithIssues.map((item) => (
											<li key={item.id} className="flex items-center gap-1">
												<span aria-hidden="true">•</span>
												<span className="line-clamp-1">
													{item.sku.product.title}
													{` (${getCartItemIssueLabel(item)})`}
												</span>
											</li>
										))}
									</ul>
								</div>
							)}

							<div className="shrink-0">
								<CartPriceChangeAlert items={optimisticCart.items} />
							</div>

							<div className="min-h-0 flex-1">
								<ScrollFade axis="vertical" className="h-full" hideScrollbar={false}>
									<div className="space-y-3 px-6 py-4">
										<AnimatePresence mode="popLayout" initial={false}>
											{optimisticCart.items.map((item) => (
												<m.div
													key={item.id}
													layout
													initial={{ opacity: 0, height: 0, scale: 0.95 }}
													animate={{ opacity: 1, height: "auto", scale: 1 }}
													exit={{ opacity: 0, height: 0, scale: 0.95 }}
													transition={
														shouldReduceMotion ? { duration: 0 } : MOTION_CONFIG.spring.list
													}
													className="origin-top overflow-hidden"
												>
													<CartSheetItemRow item={item} onClose={close} />
												</m.div>
											))}
										</AnimatePresence>
									</div>
								</ScrollFade>
							</div>

							{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
							<div
								onClick={(e) => {
									if ((e.target as HTMLElement).closest("a")) {
										close();
									}
								}}
							>
								{recommendations}
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
