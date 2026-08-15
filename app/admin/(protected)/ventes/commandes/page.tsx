import { type Metadata } from "next";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { ReconcilePendingOrdersButton } from "@/modules/orders/components/reconcile-pending-orders-button";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = {
	title: "Commandes - Administration",
};

/**
 * STUB partiel (migration lean) — la gestion complète (liste, détail,
 * expédition) est réécrite au lot 4. Le lot 3 y pose déjà le filet manuel des
 * réservations orphelines : « Vérifier les commandes en attente » interroge
 * Stripe sur les PENDING > 24 h et applique l'état réel des sessions.
 */
export default async function AdminOrdersStubPage() {
	await assertAdminPage();

	return (
		<>
			<PageHeader variant="compact" title="Commandes" />
			<div className="space-y-4">
				<p className="text-muted-foreground max-w-prose text-sm">
					La gestion des commandes est indisponible pendant la migration vers le nouveau schéma
					(réécriture au lot 4). Les commandes existantes restent visibles dans le dashboard Stripe.
				</p>
				<div className="space-y-2">
					<ReconcilePendingOrdersButton />
					<p className="text-muted-foreground max-w-prose text-xs">
						Si un webhook Stripe s&apos;est perdu, une commande peut rester « en attente » avec du
						stock réservé. Ce bouton interroge Stripe et remet chaque commande de plus de 24 h dans
						son état réel (payée, ou annulée avec stock restitué).
					</p>
				</div>
			</div>
		</>
	);
}
