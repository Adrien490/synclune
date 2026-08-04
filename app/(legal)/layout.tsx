import { Footer, FooterSkeleton } from "@/app/(shop)/(home)/_components/footer";
import { Navbar, NavbarSkeleton } from "@/app/(shop)/(home)/_components/navbar";
import { isAdmin } from "@/modules/auth/utils/guards";
import { getStoreStatus } from "@/modules/store-settings/data/get-store-status";

import { CookieBannerLazy } from "@/shared/components/cookie-banner-lazy";
import { MaintenanceBanner } from "@/shared/components/maintenance-banner";
import { Suspense } from "react";

/**
 * Layout for legal pages — always accessible, even when the store is closed (RGPD compliance).
 * No store closure gate. Shows MaintenanceBanner if store is closed (admin awareness).
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
			<CookieBannerLazy />
		</>
	);
}
