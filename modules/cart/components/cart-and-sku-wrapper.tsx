import { Suspense } from "react";
import { CartAndSkuLazy } from "@/modules/cart/components/cart-and-sku-lazy";
import { CartSheetRecommendations } from "@/modules/cart/components/cart-sheet-recommendations";
import { CartSheetSkeleton } from "@/modules/cart/components/cart-sheet-skeleton";
import { getCart } from "@/modules/cart/data/get-cart";

export function CartAndSkuWrapper() {
	return (
		<Suspense fallback={<CartSheetSkeleton />}>
			<CartAndSkuLoader />
		</Suspense>
	);
}

async function CartAndSkuLoader() {
	const cart = await getCart();
	return (
		<CartAndSkuLazy
			cart={cart}
			recommendations={
				<Suspense key="cart-sheet-recommendations" fallback={null}>
					<CartSheetRecommendations />
				</Suspense>
			}
		/>
	);
}
