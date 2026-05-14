import { Suspense } from "react";
import { CartSheet } from "@/modules/cart/components/cart-sheet";
import { CartSheetRecommendations } from "@/modules/cart/components/cart-sheet-recommendations";
import { CartSheetSkeleton } from "@/modules/cart/components/cart-sheet-skeleton";
import { SkuSelectorDialog } from "@/modules/cart/components/sku-selector-dialog";
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
		<>
			<CartSheet
				key="cart-sheet"
				cart={cart}
				recommendations={
					<Suspense key="cart-sheet-recommendations" fallback={null}>
						<CartSheetRecommendations />
					</Suspense>
				}
			/>
			<SkuSelectorDialog key="sku-selector" cart={cart} />
		</>
	);
}
