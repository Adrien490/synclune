import { getSession } from "@/modules/auth/lib/get-current-session";
import { getFabVisibility } from "@/shared/data/get-fab-visibility";
import { FAB_KEYS } from "@/shared/constants/fab";
import { ROUTES } from "@/shared/constants/urls";
import { Fab } from "@/shared/components/fab";
import { LayoutDashboard } from "lucide-react";

/**
 * Server component wrapper for the admin dashboard FAB
 *
 * Only renders for authenticated admin users on the storefront.
 * Hidden on mobile (admin link remains in mobile nav menu).
 */
export async function AdminDashboardFab() {
	const session = await getSession();

	if (!session?.user || session.user.role !== "ADMIN") {
		return null;
	}

	const isHidden = await getFabVisibility(FAB_KEYS.ADMIN_DASHBOARD);

	return (
		<Fab
			fabKey={FAB_KEYS.ADMIN_DASHBOARD}
			initialHidden={isHidden}
			icon={<LayoutDashboard className="size-6" aria-hidden="true" />}
			tooltip={{ title: "Tableau de bord" }}
			ariaLabel="Accéder au tableau de bord administrateur"
			href={ROUTES.ADMIN.ROOT}
			hideOnMobile
		/>
	);
}
