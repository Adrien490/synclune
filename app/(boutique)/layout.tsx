import { Footer } from "@/app/(boutique)/(accueil)/_components/footer";
import { Navbar } from "@/app/(boutique)/(accueil)/_components/navbar";
import { NavbarSkeleton } from "@/app/(boutique)/(accueil)/_components/navbar/navbar-skeleton";
import { isAdmin } from "@/modules/auth/utils/guards";
import { AdminDashboardFab } from "@/shared/components/admin-dashboard-fab";
import { FAB_KEYS } from "@/shared/constants/fab";
import { getFabVisibility } from "@/shared/data/get-fab-visibility";
import { Suspense } from "react";

interface ShopLayoutProps {
	children: React.ReactNode;
}

export default async function ShopLayout({
	children,
}: ShopLayoutProps) {
	const [userIsAdmin, isAdminFabHidden] = await Promise.all([
		isAdmin(),
		getFabVisibility(FAB_KEYS.ADMIN_DASHBOARD),
	]);

	return (
		<>
			<Suspense fallback={<NavbarSkeleton />}>
				<Navbar />
			</Suspense>
			<main
				id="main-content"
				role="main"
				aria-label="Contenu principal"
				className="min-h-screen"
			>
				{children}
			</main>
			<Footer />

			{userIsAdmin && <AdminDashboardFab initialHidden={isAdminFabHidden} />}
		</>
	);
}
