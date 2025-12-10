"use client";

import { use } from "react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { useSwipeGesture } from "@/shared/hooks/use-swipe-gesture";
import { CartSheetItemRow } from "./cart-sheet-item-row";
import { RemoveCartItemAlertDialog } from "./remove-cart-item-alert-dialog";
import type { GetCartReturn } from "../types/cart.types";

interface CartSheetProps {
	cartPromise: Promise<GetCartReturn>;
}

export function CartSheet({ cartPromise }: CartSheetProps) {
	const { isOpen, close } = useSheet("cart");
	const cart = use(cartPromise);
	const swipeHandlers = useSwipeGesture({ onSwipe: close, direction: "right" });

	const hasItems = cart && cart.items.length > 0;

	// Calculs pour le résumé
	const totalItems = hasItems
		? cart.items.reduce((sum, item) => sum + item.quantity, 0)
		: 0;

	const subtotal = hasItems
		? cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0)
		: 0;

	const itemsWithIssues = hasItems
		? cart.items.filter(
				(item) =>
					item.sku.inventory < item.quantity ||
					!item.sku.isActive ||
					item.sku.product.status !== "PUBLIC"
			)
		: [];
	const hasStockIssues = itemsWithIssues.length > 0;

	return (
		<>
			<Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-lg flex flex-col p-0 gap-0"
					{...swipeHandlers}
				>
					<SheetHeader className="px-6 py-4 border-b shrink-0">
						<SheetTitle>
							Mon panier
							{hasItems && (
								<span className="transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50">
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
						<>
							<div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 py-12 text-center">
								<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
									<ShoppingBag className="w-8 h-8 text-muted-foreground" />
								</div>
								<h3 className="text-lg font-medium mb-2">Ton panier est vide !</h3>
								<p className="text-sm text-muted-foreground max-w-[280px]">
									Tu peux aller jeter un oeil à mes créations si tu le souhaites 😁
								</p>
							</div>

							<SheetFooter className="px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t mt-auto shrink-0">
								<Button
									asChild
									size="lg"
									className="w-full group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
									onClick={close}
								>
									<Link href="/produits">Decouvrir la boutique</Link>
								</Button>
							</SheetFooter>
						</>
					) : (
						<>
							<ScrollArea className="flex-1 min-h-0">
								<div className="px-6 py-4 space-y-3">
									{cart.items.map((item) => (
										<CartSheetItemRow key={item.id} item={item} onClose={close} />
									))}
								</div>
								{/* Indicateur de scroll - fade gradient */}
								<div
									className="pointer-events-none sticky bottom-0 h-8 bg-linear-to-t from-background to-transparent"
									aria-hidden="true"
								/>
							</ScrollArea>

							<SheetFooter className="px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t mt-auto shrink-0">
								<div className="w-full space-y-3">
									{/* Total */}
									<div className="flex justify-between items-center">
										<span className="font-semibold">
											Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})
										</span>
										<span className="font-mono font-bold text-lg transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50 group-has-[[data-pending]]/sheet:animate-pulse">
											{formatEuro(subtotal)}
										</span>
									</div>

									{/* Alerte si problemes */}
									{hasStockIssues && (
										<div
											className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive"
											role="alert"
										>
											<p className="font-medium">Ajuste ton panier pour continuer</p>
											<p className="mt-0.5 text-destructive/80">
												{itemsWithIssues.length} article
												{itemsWithIssues.length > 1 ? "s" : ""} necessitent ton attention
											</p>
										</div>
									)}

									{/* CTAs */}
									<div className="space-y-2">
										{hasStockIssues ? (
											<Button
												size="lg"
												className="w-full"
												disabled
												title="Ajuste ton panier pour continuer"
											>
												Passer commande
											</Button>
										) : (
											<Button
												asChild
												size="lg"
												className="w-full group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
												onClick={close}
											>
												<Link href="/paiement">Passer commande</Link>
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
		</>
	);
}
