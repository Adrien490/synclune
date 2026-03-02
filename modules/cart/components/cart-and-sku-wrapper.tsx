import { CartSheetRecommendations } from "@/modules/cart/components/cart-sheet-recommendations";
import { CartSheetSkeleton } from "@/modules/cart/components/cart-sheet-skeleton";
import { getCart } from "@/modules/cart/data/get-cart";
import { ErrorBoundary } from "@/shared/components/error-boundary";
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
		<ErrorBoundary
			errorMessage="Impossible de charger le panier"
			className="bg-muted fixed right-4 bottom-4 z-50 flex max-w-xs items-center justify-center rounded-lg shadow-lg"
		>
			<Suspense fallback={<CartSheetSkeleton />}>
				<CartAndSkuLoader />
			</Suspense>
		</ErrorBoundary>
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
