import { Suspense } from "react";
import { CartAndVariantLazy } from "@/modules/cart/components/cart-and-variant-lazy";
import { CartSheetRecommendations } from "@/modules/cart/components/cart-sheet-recommendations";
import { CartSheetSkeleton } from "@/modules/cart/components/cart-sheet-skeleton";
import { getCart } from "@/modules/cart/data/get-cart";

export function CartAndVariantWrapper() {
	return (
		<Suspense fallback={<CartSheetSkeleton />}>
			<CartAndVariantLoader />
		</Suspense>
	);
}

async function CartAndVariantLoader() {
	// Plus de « boutique fermée » : StoreSettings est parti avec le schéma lean.
	const cart = await getCart();
	return (
		<CartAndVariantLazy
			cart={cart}
			recommendations={
				<Suspense key="cart-sheet-recommendations" fallback={null}>
					<CartSheetRecommendations />
				</Suspense>
			}
		/>
	);
}
