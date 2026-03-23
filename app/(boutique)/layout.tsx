import { Footer, FooterSkeleton } from "@/app/(boutique)/(accueil)/_components/footer";
import { Navbar, NavbarSkeleton } from "@/app/(boutique)/(accueil)/_components/navbar";
import { AnnouncementBarWrapper } from "@/modules/announcements/components/announcement-bar-wrapper";
import { isAdmin } from "@/modules/auth/utils/guards";
import { StoreClosurePage } from "@/modules/store-settings/components/store-closure-page";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";

import { AdminDashboardFab } from "@/shared/components/admin-dashboard-fab";
import { ConditionalAnalytics } from "@/shared/components/conditional-analytics";
import { CookieBanner } from "@/shared/components/cookie-banner";
import { MaintenanceBanner } from "@/shared/components/maintenance-banner";
import { WebVitalsReporter } from "@/shared/components/web-vitals-reporter";
import { Suspense } from "react";
import { CartAndSkuWrapper } from "@/modules/cart/components/cart-and-sku-wrapper";
import { QuickSearchDialogAsync } from "@/modules/products/components/quick-search-dialog/quick-search-dialog-async";

interface ShopLayoutProps {
	children: React.ReactNode;
}

export default async function ShopLayout({ children }: ShopLayoutProps) {
	const storeStatus = await getStoreStatus();

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
			<CookieBanner />
			<ConditionalAnalytics />
			<WebVitalsReporter />
		</>
	);
}
