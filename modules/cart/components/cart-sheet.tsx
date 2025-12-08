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
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { CartSheetItemRow } from "./cart-sheet-item-row";
import { CartSheetSummary } from "./cart-sheet-summary";
import { RemoveCartItemAlertDialog } from "./remove-cart-item-alert-dialog";
import type { GetCartReturn } from "../types/cart.types";

interface CartSheetProps {
	cartPromise: Promise<GetCartReturn>;
}

export function CartSheet({ cartPromise }: CartSheetProps) {
	const { isOpen, close } = useSheet("cart");
	const cart = use(cartPromise);

	const hasItems = cart && cart.items.length > 0;

	return (
		<>
			<Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
				<SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
					<SheetHeader className="px-6 py-4 border-b shrink-0">
						<SheetTitle className="flex items-center gap-2 text-lg">
							<ShoppingBag className="w-5 h-5" />
							Mon panier
						</SheetTitle>
						<SheetDescription className="sr-only">
							Contenu de ton panier - Gere tes articles et passe commande
						</SheetDescription>
					</SheetHeader>

					{!hasItems ? (
						<div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
							<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
								<ShoppingBag className="w-8 h-8 text-muted-foreground" />
							</div>
							<h3 className="text-lg font-medium mb-2">Ton panier est vide</h3>
							<p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
								Explore mes creations et trouve la piece parfaite pour toi
							</p>
							<Button asChild onClick={close}>
								<Link href="/produits">Decouvrir la boutique</Link>
							</Button>
						</div>
					) : (
						<>
							<ScrollArea className="flex-1 min-h-0">
								<div className="px-6 py-4 space-y-3">
									{cart.items.map((item) => (
										<CartSheetItemRow key={item.id} item={item} onClose={close} />
									))}
								</div>
							</ScrollArea>

							<SheetFooter className="px-6 py-4 border-t mt-auto shrink-0">
								<CartSheetSummary cart={cart} onClose={close} />
							</SheetFooter>
						</>
					)}
				</SheetContent>
			</Sheet>

			<RemoveCartItemAlertDialog />
		</>
	);
}
