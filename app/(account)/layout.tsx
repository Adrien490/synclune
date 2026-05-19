import { Footer, FooterSkeleton } from "@/app/(shop)/(home)/_components/footer";
import { Navbar, NavbarSkeleton } from "@/app/(shop)/(home)/_components/navbar";
import { ShopMobileBottomNav } from "@/app/(shop)/(home)/_components/shop-mobile-bottom-nav";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";

import { AnnouncementBarWrapper } from "@/shared/components/announcement-bar-wrapper";
import { CookieBannerLazy } from "@/shared/components/cookie-banner-lazy";
import { MaintenanceBanner } from "@/shared/components/maintenance-banner";
import { PullToRefresh } from "@/shared/components/pull-to-refresh";
import { SentryUserBridge } from "@/shared/components/sentry-user-bridge";
import { Suspense } from "react";
import { CartAndSkuWrapper } from "@/modules/cart/components/cart-and-sku-wrapper";
import type { Metadata } from "next";
import { EspaceClientContent } from "./_components/espace-client-content";

export const metadata: Metadata = {
	title: {
		template: "%s | Mon compte | Synclune",
		default: "Mon compte | Synclune",
	},
	robots: { index: false, follow: false },
};

/**
 * Layout for account pages — accessible to authenticated users even when the store is closed.
 * Auth enforcement is handled by the proxy (protectedRoutes).
 * No store closure gate. Shows MaintenanceBanner if store is closed.
 */
async function MobileBottomNavWithAuth() {
	const session = await getSession().catch(() => null);
	return <ShopMobileBottomNav isAuthenticated={Boolean(session?.user)} />;
}

async function SentryUserBridgeWithAuth() {
	const session = await getSession().catch(() => null);
	return <SentryUserBridge userId={session?.user.id} role={session?.user.role} />;
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
	const storeStatus = await getStoreStatus();

	return (
		<>
			<PullToRefresh />
			{storeStatus.isClosed && <MaintenanceBanner closureMessage={storeStatus.closureMessage} />}
			<Suspense fallback={null}>
				<AnnouncementBarWrapper />
			</Suspense>
			<Suspense fallback={<NavbarSkeleton />}>
				<Navbar />
			</Suspense>
			<main id="main-content" tabIndex={-1} aria-label="Contenu principal" className="min-h-screen">
				<Suspense>
					<EspaceClientContent>{children}</EspaceClientContent>
				</Suspense>
			</main>
			<Suspense fallback={<FooterSkeleton />}>
				<Footer />
			</Suspense>
			<CartAndSkuWrapper />
			<Suspense fallback={null}>
				<MobileBottomNavWithAuth />
			</Suspense>
			<Suspense fallback={null}>
				<SentryUserBridgeWithAuth />
			</Suspense>
			<CookieBannerLazy />
		</>
	);
}
