import { Suspense } from "react";
import { CartAndSkuLazy } from "@/modules/cart/components/cart-and-sku-lazy";
import { CartSheetRecommendations } from "@/modules/cart/components/cart-sheet-recommendations";
import { CartSheetSkeleton } from "@/modules/cart/components/cart-sheet-skeleton";
import { getCart } from "@/modules/cart/data/get-cart";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";

export function CartAndSkuWrapper() {
	return (
		<Suspense fallback={<CartSheetSkeleton />}>
			<CartAndSkuLoader />
		</Suspense>
	);
}

async function CartAndSkuLoader() {
	// Le statut boutique est lu ici pour que le sélecteur de variante puisse le
	// DESSINER : jusqu'ici la fermeture n'était refusée que par `assertStoreOpen`,
	// côté serveur, en toast — après le clic sur « Ajouter au panier ».
	const [cart, storeStatus] = await Promise.all([getCart(), getStoreStatus()]);
	return (
		<CartAndSkuLazy
			cart={cart}
			isStoreClosed={storeStatus.isClosed}
			storeClosureMessage={storeStatus.closureMessage}
			recommendations={
				<Suspense key="cart-sheet-recommendations" fallback={null}>
					<CartSheetRecommendations />
				</Suspense>
			}
		/>
	);
}
