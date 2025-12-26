"use client";

import { use, useOptimistic, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import ScrollFade from "@/shared/components/ui/scroll-fade";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingBag, Truck } from "lucide-react";
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
import type { GetCartReturn } from "../types/cart.types";
import {
	CartOptimisticContext,
	type CartOptimisticAction,
} from "../contexts/cart-optimistic-context";

// Reducer extrait pour éviter la recréation à chaque render
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
	}
}

interface CartSheetProps {
	cartPromise: Promise<GetCartReturn>;
}

export function CartSheet({ cartPromise }: CartSheetProps) {
	const { isOpen, close } = useSheet("cart");
	const cart = use(cartPromise);
	const shouldReduceMotion = useReducedMotion();
	const [isPending, startTransition] = useTransition();

	// Optimistic state pour la liste d'items et leurs quantités
	const [optimisticCart, updateOptimisticCart] = useOptimistic(
		cart,
		cartReducer
	);

	const hasItems = optimisticCart && optimisticCart.items.length > 0;

	// Calculs pour le résumé - basés sur l'état optimiste
	const totalItems = hasItems
		? optimisticCart.items.reduce((sum, item) => sum + item.quantity, 0)
		: 0;

	const subtotal = hasItems
		? optimisticCart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0)
		: 0;

	const itemsWithIssues = hasItems
		? optimisticCart.items.filter(
				(item) =>
					item.sku.inventory < item.quantity ||
					!item.sku.isActive ||
					item.sku.product.status !== "PUBLIC"
			)
		: [];
	const hasStockIssues = itemsWithIssues.length > 0;

	// Valeur du contexte optimiste
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
									aria-live="polite"
									aria-atomic="true"
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

					{/* Live region pour les lecteurs d'écran */}
					<div aria-live="polite" aria-atomic="true" className="sr-only">
						{hasItems
							? `${totalItems} article${totalItems > 1 ? "s" : ""} dans le panier, sous-total ${formatEuro(subtotal)}`
							: "Panier vide"}
					</div>

					{!hasItems ? (
						<div className="flex-1 min-h-0 flex flex-col px-6 py-8">
							<Empty className="flex-1 border-0">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<ShoppingBag className="size-6" />
									</EmptyMedia>
									<EmptyTitle>Ton panier est vide !</EmptyTitle>
								</EmptyHeader>
								<EmptyContent>
									<p className="text-muted-foreground max-w-[280px]">
										Tu peux aller jeter un oeil à mes créations si tu le souhaites 😁
									</p>
									<Button
										asChild
										size="lg"
										className="w-full max-w-xs group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
									>
										<Link href="/produits" onClick={close}>Découvrir la boutique</Link>
									</Button>
								</EmptyContent>
							</Empty>
						</div>
					) : (
						<>
							<div className="flex-1 min-h-0">
								<ScrollFade
									axis="vertical"
									className="h-full"
									hideScrollbar={false}
								>
									<div className="px-6 py-4 space-y-3">
										<AnimatePresence mode="popLayout" initial={false}>
											{optimisticCart.items.map((item) => (
												<motion.div
													key={item.id}
													layout
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: "auto" }}
													exit={{ opacity: 0, height: 0 }}
													transition={{
														duration: shouldReduceMotion ? 0 : 0.2,
														ease: [0, 0, 0.2, 1],
													}}
													className="overflow-hidden"
												>
													<CartSheetItemRow item={item} onClose={close} />
												</motion.div>
											))}
										</AnimatePresence>

										{/* Alerte changement de prix */}
										<CartPriceChangeAlert items={optimisticCart.items} />
									</div>
								</ScrollFade>
							</div>

							<SheetFooter className="px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t mt-auto shrink-0">
								<div className="w-full space-y-3">
									{/* Total */}
									<div className="flex justify-between items-center">
										<span className="font-semibold">
											Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})
										</span>
										<span
											aria-busy={isPending}
											aria-live="polite"
											className="font-mono font-bold text-lg transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50 group-has-[[data-pending]]/sheet:animate-pulse"
										>
											{formatEuro(subtotal)}
										</span>
									</div>

									{/* Alerte si problemes */}
									{hasStockIssues && (
										<div
											id="stock-issues-alert"
											className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive"
											role="alert"
											aria-label="Problemes de stock dans le panier"
										>
											<p className="font-medium">Ajuste ton panier pour continuer</p>
											<ul className="mt-1 space-y-0.5 text-destructive/80">
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

									{/* CTAs */}
									<div className="space-y-2">
										{hasStockIssues ? (
											<Button
												size="lg"
												className="w-full"
												disabled
												aria-disabled="true"
												aria-describedby="stock-issues-alert"
											>
												Passer commande
											</Button>
										) : (
											<Button
												asChild
												size="lg"
												className="w-full group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
											>
												<Link href="/paiement" onClick={close}>Passer commande</Link>
											</Button>
										)}

										<Button
											variant="secondary"
											size="lg"
											className="w-full group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
											onClick={close}
										>
											Continuer mes achats
										</Button>
									</div>

									<p className="text-[11px] text-muted-foreground flex items-center justify-between">
										<span className="flex items-center gap-1">
											<Truck className="w-3 h-3" />
											Livraison estimée au paiement
										</span>
										<span>TVA non applicable</span>
									</p>
								</div>
							</SheetFooter>
						</>
					)}
				</SheetContent>
			</Sheet>

			<RemoveCartItemAlertDialog />
		</CartOptimisticContext.Provider>
	);
}
