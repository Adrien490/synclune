import { CartSheetRecommendations } from "@/modules/cart/components/cart-sheet-recommendations";
import { CartSheetSkeleton } from "@/modules/cart/components/cart-sheet-skeleton";
import { getCart } from "@/modules/cart/data/get-cart";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const CartSheet = dynamic(() =>
	import("@/modules/cart/components/cart-sheet").then((mod) => mod.CartSheet),
);

const SkuSelectorDialog = dynamic(() =>
	import("@/modules/cart/components/sku-selector-dialog").then((mod) => mod.SkuSelectorDialog),
);

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
				cart={cart}
				recommendations={
					<Suspense fallback={null}>
						<CartSheetRecommendations />
					</Suspense>
				}
			/>
			<SkuSelectorDialog cart={cart} />
		</>
	);
}
