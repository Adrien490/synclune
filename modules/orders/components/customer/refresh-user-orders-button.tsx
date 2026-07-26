"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { usePullToRefreshHandler } from "@/shared/hooks/use-pull-to-refresh-handler";
import { refreshUserOrders } from "@/modules/orders/actions/refresh-user-orders";

/**
 * Bouton « Actualiser mes commandes » de l'espace client.
 *
 * `hideOnMobile={false}` : c'est **l'alternative visible** au geste
 * pull-to-refresh. Sans elle, le geste était le seul chemin vers un
 * rafraîchissement dans tout `app/(account)` — or un geste ne doit jamais être le
 * seul accès à une action.
 *
 * Le bouton et le geste passent par la même Server Action (`updateTag` sur les
 * tags user-scopés) : aucune divergence possible entre les deux chemins.
 */
export function RefreshUserOrdersButton() {
	const { refresh, isPending } = useRefreshAction(refreshUserOrders);

	usePullToRefreshHandler(refresh);

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Actualiser mes commandes"
			hideOnMobile={false}
			variant="ghost"
		/>
	);
}
