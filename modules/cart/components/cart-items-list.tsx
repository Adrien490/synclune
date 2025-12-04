import { CartItemRow } from "./cart-item-row";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { AnimatePresence } from "framer-motion";
import { use } from "react";

interface CartItemsListProps {
	cartPromise: Promise<GetCartReturn>;
}

export function CartItemsList({ cartPromise }: CartItemsListProps) {
	const cart = use(cartPromise);

	if (!cart || cart.items.length === 0) {
		return null;
	}

	return (
		<div className="space-y-4">
			{/* Heading h2 pour lecteurs d'écran (améliore accessibilité WCAG AAA) */}
			<h2 className="sr-only">Articles dans ton panier</h2>

			<AnimatePresence mode="popLayout">
				{cart.items.map((item) => (
					<CartItemRow key={item.id} item={item} />
				))}
			</AnimatePresence>
		</div>
	);
}
