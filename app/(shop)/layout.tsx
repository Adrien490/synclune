import { Footer, FooterSkeleton } from "@/app/(shop)/(home)/_components/footer";
import { Navbar, NavbarSkeleton } from "@/app/(shop)/(home)/_components/navbar";
import { ShopMobileBottomNav } from "@/app/(shop)/(home)/_components/shop-mobile-bottom-nav";
import { isAdmin } from "@/modules/auth/utils/guards";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { StoreClosurePage } from "@/modules/store-settings/components/store-closure-page";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";

import { AdminDashboardFab } from "@/shared/components/admin-dashboard-fab";
import { AnnouncementBarWrapper } from "@/shared/components/announcement-bar-wrapper";
import { CookieBannerLazy } from "@/shared/components/cookie-banner-lazy";
import { MaintenanceBanner } from "@/shared/components/maintenance-banner";
import { SentryUserBridge } from "@/shared/components/sentry-user-bridge";
import { Suspense } from "react";
import { CartAndSkuWrapper } from "@/modules/cart/components/cart-and-sku-wrapper";
import { QuickSearchDialogAsync } from "@/modules/products/components/quick-search-dialog/quick-search-dialog-async";

interface ShopLayoutProps {
	children: React.ReactNode;
}

export default function ShopLayout({ children }: ShopLayoutProps) {
	return (
		<Suspense>
			<ShopLayoutContent>{children}</ShopLayoutContent>
		</Suspense>
	);
}

async function ShopLayoutContent({ children }: ShopLayoutProps) {
	const [storeStatus, session] = await Promise.all([
		getStoreStatus(),
		getSession().catch(() => null),
	]);

	if (storeStatus.isClosed) {
		const admin = await isAdmin();

		if (!admin) {
			return (
				<>
					<StoreClosurePage status={storeStatus} />
					<CookieBannerLazy />
				</>
			);
		}
	}

	return (
		<>
			{storeStatus.isClosed && (
				<MaintenanceBanner
					closureMessage={storeStatus.closureMessage}
					reopensAt={storeStatus.reopensAt}
				/>
			)}
			<Suspense fallback={null}>
				<AnnouncementBarWrapper />
			</Suspense>
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
			<Suspense fallback={null}>
				<AdminDashboardFab />
			</Suspense>
			<ShopMobileBottomNav />
			{/* Pas de pull-to-refresh sur le storefront : le contenu vient de caches longs
			    (`catalog` 15 min, `reference` 24 h) qu'un `router.refresh()` ne renouvelle
			    pas. Le geste n'y aurait rien à rafraîchir — il est réservé aux surfaces
			    admin, où il partage le chemin d'invalidation des boutons « Rafraîchir »
			    (cf. `use-pull-to-refresh-handler`). */}
			<SentryUserBridge userId={session?.user.id} role={session?.user.role} />
			<CookieBannerLazy />
		</>
	);
}
