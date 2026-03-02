import { Footer } from "@/app/(boutique)/(accueil)/_components/footer";
import { NavbarSuspenseWrapper } from "@/app/(boutique)/(accueil)/_components/navbar";
import { CartAndSkuWrapper } from "@/modules/cart/components/cart-and-sku-wrapper";
import { ScrollToTop } from "@/shared/components/scroll-to-top";

interface ShopLayoutProps {
	children: React.ReactNode;
}

export default async function ShopLayout({ children }: ShopLayoutProps) {
	return (
		<>
			<NavbarSuspenseWrapper />
			<main id="main-content" tabIndex={-1} aria-label="Contenu principal" className="min-h-screen">
				{children}
			</main>
			<Footer />
			<ScrollToTop />
			<CartAndSkuWrapper />
		</>
	);
}
