import { Footer, FooterSkeleton } from "@/app/(shop)/(home)/_components/footer";
import { Navbar, NavbarSkeleton } from "@/app/(shop)/(home)/_components/navbar";
import { ShopMobileBottomNav } from "@/app/(shop)/(home)/_components/shop-mobile-bottom-nav";
import { isAdmin } from "@/modules/auth/utils/guards";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { StoreClosurePage } from "@/modules/store-settings/components/store-closure-page";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";

import { AdminDashboardFab } from "@/shared/components/admin-dashboard-fab";
import { AnnouncementBarWrapper } from "@/shared/components/announcement-bar-wrapper";
import { CookieBanner } from "@/shared/components/cookie-banner";
import { MaintenanceBanner } from "@/shared/components/maintenance-banner";
import { PullToRefresh } from "@/shared/components/pull-to-refresh";
import { SentryUserBridge } from "@/shared/components/sentry-user-bridge";
import { VisualViewportBridge } from "@/shared/components/visual-viewport-bridge";
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
	const isAuthenticated = Boolean(session?.user);

	if (storeStatus.isClosed) {
		const admin = await isAdmin();

		if (!admin) {
			return (
				<>
					<StoreClosurePage status={storeStatus} />
					<CookieBanner />
				</>
			);
		}
	}

	return (
		<>
			{storeStatus.isClosed && <MaintenanceBanner closureMessage={storeStatus.closureMessage} />}
			<Suspense fallback={null}>
				<AnnouncementBarWrapper />
			</Suspense>
			<Suspense fallback={<NavbarSkeleton />}>
				<Navbar />
			</Suspense>
			<main id="main-content" tabIndex={-1} aria-label="Contenu principal" className="min-h-screen">
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
			<ShopMobileBottomNav isAuthenticated={isAuthenticated} />
			<PullToRefresh />
			<VisualViewportBridge />
			<SentryUserBridge userId={session?.user.id} role={session?.user.role} />
			<CookieBanner />
		</>
	);
}
