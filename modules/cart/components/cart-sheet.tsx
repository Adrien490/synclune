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
import ScrollFade from "@/shared/components/scroll-fade";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingBag, Truck, ShieldCheck, RotateCcw, Package } from "lucide-react";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
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
							{/* Alerte stock EN HAUT - visible immédiatement */}
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

									{/* Méthodes de paiement acceptées (Baymard: 11% abandons si non visibles) */}
									<div className="flex items-center justify-center gap-2 py-1">
										<span className="text-[10px] text-muted-foreground">Paiement :</span>
										<div className="flex items-center gap-1.5">
											{/* Visa */}
											<svg className="h-5 w-auto" viewBox="0 0 48 32" aria-label="Visa">
												<rect width="48" height="32" rx="4" fill="#1A1F71" />
												<path d="M19.5 21.5H17L18.75 10.5H21.25L19.5 21.5ZM15.25 10.5L12.85 18.1L12.55 16.65L12.55 16.65L11.65 11.4C11.65 11.4 11.55 10.5 10.4 10.5H6.1L6 10.7C6 10.7 7.3 10.95 8.8 11.85L11 21.5H13.6L17.9 10.5H15.25ZM36 21.5H38.25L36.3 10.5H34.2C33.25 10.5 33 11.2 33 11.2L29.2 21.5H31.8L32.35 19.9H35.5L36 21.5ZM33.05 17.85L34.45 13.85L35.25 17.85H33.05ZM28.85 13.3L29.25 10.75C29.25 10.75 28.1 10.35 26.9 10.35C25.6 10.35 22.6 10.9 22.6 13.55C22.6 16.05 26.1 16.1 26.1 17.4C26.1 18.7 22.95 18.35 21.85 17.45L21.4 20.1C21.4 20.1 22.6 20.65 24.4 20.65C26.2 20.65 28.8 19.7 28.8 17.25C28.8 14.7 25.25 14.45 25.25 13.35C25.25 12.25 27.7 12.45 28.85 13.3Z" fill="white" />
											</svg>
											{/* Mastercard */}
											<svg className="h-5 w-auto" viewBox="0 0 48 32" aria-label="Mastercard">
												<rect width="48" height="32" rx="4" fill="#1A1F2E" />
												<circle cx="18" cy="16" r="8" fill="#EB001B" />
												<circle cx="30" cy="16" r="8" fill="#F79E1B" />
												<path d="M24 10.5C25.8 12 27 14.3 27 16.9C27 19.5 25.8 21.8 24 23.3C22.2 21.8 21 19.5 21 16.9C21 14.3 22.2 12 24 10.5Z" fill="#FF5F00" />
											</svg>
											{/* CB (Carte Bleue) */}
											<svg className="h-5 w-auto" viewBox="0 0 48 32" aria-label="Carte Bleue">
												<rect width="48" height="32" rx="4" fill="#0064B3" />
												<text x="24" y="19" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">CB</text>
											</svg>
											{/* Apple Pay */}
											<svg className="h-5 w-auto" viewBox="0 0 48 32" aria-label="Apple Pay">
												<rect width="48" height="32" rx="4" fill="#000" />
												<path d="M15.5 11.5c.5-.6.8-1.4.7-2.2-.7 0-1.6.5-2.1 1.1-.4.5-.8 1.4-.7 2.2.8.1 1.6-.4 2.1-1.1zm.7 1.2c-1.2-.1-2.2.7-2.8.7-.6 0-1.4-.6-2.4-.6-1.2 0-2.3.7-2.9 1.8-1.3 2.2-.3 5.4.9 7.2.6.9 1.3 1.8 2.3 1.8.9 0 1.2-.6 2.3-.6s1.4.6 2.4.6c1 0 1.6-.9 2.2-1.8.7-1 1-2 1-2-.1 0-1.9-.7-1.9-2.9 0-1.8 1.5-2.7 1.5-2.7-.8-1.2-2.1-1.4-2.6-1.5z" fill="white" />
												<text x="28" y="19" fill="white" fontSize="7" fontWeight="500">Pay</text>
											</svg>
										</div>
									</div>

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

									{/* Estimation frais de port */}
									<div className="flex items-center justify-between text-[11px] text-muted-foreground">
										<span className="flex items-center gap-1">
											<Truck className="w-3 h-3" />
											Livraison : {formatEuro(SHIPPING_RATES.FR.amount)} - {formatEuro(SHIPPING_RATES.EU.amount)}
										</span>
										<span>France et UE</span>
									</div>

									{/* Trust badges */}
									<div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1">
										<span className="flex items-center gap-1">
											<ShieldCheck className="w-3 h-3 text-green-600" />
											Paiement sécurisé
										</span>
										<span className="flex items-center gap-1">
											<RotateCcw className="w-3 h-3 text-blue-600" />
											Retours 14j
										</span>
										<span className="flex items-center gap-1">
											<Package className="w-3 h-3" />
											Suivi colis
										</span>
									</div>
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
