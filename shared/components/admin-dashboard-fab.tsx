import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { getFabVisibility } from "@/shared/data/get-fab-visibility";
import { FAB_KEYS } from "@/shared/constants/fab";
import { ROUTES } from "@/shared/constants/urls";
import { Fab } from "@/shared/components/fab";
import { SquaresFourIcon } from "@phosphor-icons/react/ssr";

/**
 * Server component wrapper for the admin dashboard FAB
 *
 * Only renders for authenticated admin users on the storefront.
 * Hidden on mobile (admin link remains in mobile nav menu).
 */
export async function AdminDashboardFab() {
	if (!(await isAdmin())) {
		return null;
	}

	const isHidden = await getFabVisibility(FAB_KEYS.ADMIN_DASHBOARD);

	return (
		<Fab
			fabKey={FAB_KEYS.ADMIN_DASHBOARD}
			initialHidden={isHidden}
			icon={<SquaresFourIcon className="size-6" aria-hidden="true" />}
			tooltip={{ title: "Tableau de bord" }}
			ariaLabel="Accéder au tableau de bord administrateur"
			href={ROUTES.ADMIN.ROOT}
			hideOnMobile
		/>
	);
}
