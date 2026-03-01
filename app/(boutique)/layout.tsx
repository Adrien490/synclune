import { Footer } from "@/app/(boutique)/(accueil)/_components/footer";
import { Navbar } from "@/app/(boutique)/(accueil)/_components/navbar";
import { NavbarSkeleton } from "@/app/(boutique)/(accueil)/_components/navbar/navbar-skeleton";
import { CartSheetSkeleton } from "@/modules/cart/components/cart-sheet-skeleton";
import { getCart } from "@/modules/cart/data/get-cart";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { ScrollToTop } from "@/shared/components/scroll-to-top";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const CartSheet = dynamic(() =>
	import("@/modules/cart/components/cart-sheet").then((mod) => mod.CartSheet),
);

const SkuSelectorDialog = dynamic(() =>
	import("@/modules/cart/components/sku-selector-dialog").then((mod) => mod.SkuSelectorDialog),
);

interface ShopLayoutProps {
	children: React.ReactNode;
}

export default async function ShopLayout({ children }: ShopLayoutProps) {
	return (
		<>
			<ErrorBoundary fallback={<NavbarSkeleton />}>
				<Suspense fallback={<NavbarSkeleton />}>
					<Navbar />
				</Suspense>
			</ErrorBoundary>
			<main id="main-content" aria-label="Contenu principal" className="min-h-screen">
				{children}
			</main>
			<Footer />
			<ScrollToTop />

			{/* Cart + SKU selector - storefront only (not needed on admin) */}
			<ErrorBoundary
				errorMessage="Impossible de charger le panier"
				className="bg-muted fixed right-4 bottom-4 z-50 flex max-w-xs items-center justify-center rounded-lg shadow-lg"
			>
				<Suspense fallback={<CartSheetSkeleton />}>
					<CartAndSkuLoader />
				</Suspense>
			</ErrorBoundary>
		</>
	);
}

async function CartAndSkuLoader() {
	const cart = await getCart();
	return (
		<>
			<CartSheet cart={cart} />
			<SkuSelectorDialog cart={cart} />
		</>
	);
}
