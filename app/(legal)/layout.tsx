import { Footer, FooterSkeleton } from "@/app/(shop)/(home)/_components/footer";
import { Navbar, NavbarSkeleton } from "@/app/(shop)/(home)/_components/navbar";
import { AnnouncementBarWrapper } from "@/modules/announcements/components/announcement-bar-wrapper";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";

import { ConditionalAnalytics } from "@/shared/components/conditional-analytics";
import { CookieBanner } from "@/shared/components/cookie-banner";
import { MaintenanceBanner } from "@/shared/components/maintenance-banner";
import { Suspense } from "react";

/**
 * Layout for legal pages — always accessible, even when the store is closed (RGPD compliance).
 * No store closure gate. Shows MaintenanceBanner if store is closed (admin awareness).
 */
export default async function LegalLayout({ children }: { children: React.ReactNode }) {
	const storeStatus = await getStoreStatus();

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
			<CookieBanner />
			<ConditionalAnalytics />
		</>
	);
}
