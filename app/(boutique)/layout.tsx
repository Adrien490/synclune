import { Footer } from "@/app/(boutique)/(accueil)/_components/footer";
import { Navbar, NavbarSkeleton } from "@/app/(boutique)/(accueil)/_components/navbar";
import { AnnouncementBarWrapper } from "@/modules/announcements/components/announcement-bar-wrapper";
import { isAdmin } from "@/modules/auth/utils/guards";
import { StoreClosurePage } from "@/modules/store-settings/components/store-closure-page";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { MaintenanceBanner } from "@/shared/components/maintenance-banner";
import { Suspense } from "react";
import { CartAndSkuWrapper } from "@/modules/cart/components/cart-and-sku-wrapper";
import { ScrollToTop } from "@/shared/components/scroll-to-top";
import { AdminDashboardFab } from "@/shared/components/admin-dashboard-fab";

import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
	const storeStatus = await getStoreStatus();

	if (storeStatus.isClosed) {
		return {
			title: "Boutique temporairement fermée — Synclune",
			description: storeStatus.closureMessage ?? "Notre boutique est temporairement fermée.",
			robots: { index: false, follow: false },
		};
	}

	return {};
}

interface ShopLayoutProps {
	children: React.ReactNode;
}

export default async function ShopLayout({ children }: ShopLayoutProps) {
	const storeStatus = await getStoreStatus();

	if (storeStatus.isClosed) {
		const admin = await isAdmin();

		if (!admin) {
			return <StoreClosurePage status={storeStatus} />;
		}
	}

	return (
		<>
			{storeStatus.isClosed && <MaintenanceBanner closureMessage={storeStatus.closureMessage} />}
			<Suspense fallback={null}>
				<AnnouncementBarWrapper />
			</Suspense>
			<ErrorBoundary fallback={<NavbarSkeleton />}>
				<Suspense fallback={<NavbarSkeleton />}>
					<Navbar />
				</Suspense>
			</ErrorBoundary>
			<main id="main-content" tabIndex={-1} aria-label="Contenu principal" className="min-h-screen">
				{children}
			</main>
			<Footer />
			<ScrollToTop />
			<CartAndSkuWrapper />
			<Suspense fallback={null}>
				<AdminDashboardFab />
			</Suspense>
		</>
	);
}
