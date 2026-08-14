import { Footer, FooterSkeleton } from "@/app/(shop)/(home)/_components/footer";
import { Navbar, NavbarSkeleton } from "@/app/(shop)/(home)/_components/navbar";
import { ShopMobileBottomNav } from "@/app/(shop)/(home)/_components/shop-mobile-bottom-nav";
import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";
import { CartAndSkuWrapper } from "@/modules/cart/components/cart-and-sku-wrapper";
import { QuickSearchDialogAsync } from "@/modules/products/components/quick-search-dialog/quick-search-dialog-async";

import { CookieBannerLazy } from "@/shared/components/cookie-banner-lazy";
import { MaintenanceBanner } from "@/shared/components/maintenance-banner";
import { Suspense } from "react";

/**
 * Layout for legal pages — always accessible, even when the store is closed (RGPD compliance).
 * No store closure gate. Shows MaintenanceBanner if store is closed (admin awareness).
 *
 * ⚠️ Les trois surfaces montées après `<main>` ne sont pas décoratives : la
 * `Navbar` rend un déclencheur de panier et un déclencheur de recherche, et
 * `ShopMobileBottomNav` est la seule surface d'action sous `lg`. Tant qu'elles
 * n'étaient montées que par le layout `(shop)`, les deux boutons du header
 * basculaient bien leur store sur une page légale — sans que rien ne se monte
 * pour répondre. Le badge affichait donc un compteur sur un bouton inerte, et
 * ⌘K n'était même pas enregistré (le raccourci vit dans le chunk du dialog).
 * Les CGV étant liées depuis le tunnel de paiement, ce n'était pas une impasse
 * théorique. Audit navbar 2026-08-04.
 */
export default async function LegalLayout({ children }: { children: React.ReactNode }) {
	const storeStatus = await getStoreStatus();
	const showMaintenanceBanner = storeStatus.isClosed && (await isAdmin());

	return (
		<>
			{showMaintenanceBanner && (
				<MaintenanceBanner
					closureMessage={storeStatus.closureMessage}
					reopensAt={storeStatus.reopensAt}
				/>
			)}
			<Suspense fallback={<NavbarSkeleton />}>
				<Navbar />
			</Suspense>
			<main id="main-content" tabIndex={-1} aria-label="Contenu principal" className="min-h-dvh">
				{children}
			</main>
			<Suspense fallback={<FooterSkeleton />}>
				<Footer />
			</Suspense>
			<CartAndSkuWrapper />
			<Suspense fallback={null}>
				<QuickSearchDialogAsync />
			</Suspense>
			<ShopMobileBottomNav />
			<CookieBannerLazy />
		</>
	);
}
