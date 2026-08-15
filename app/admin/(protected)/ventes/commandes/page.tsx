import { type Metadata } from "next";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = {
	title: "Commandes - Administration",
};

/**
 * STUB (migration lean, lot 2) — l'admin commandes est réécrit au lot 4 sur le
 * schéma lean (Order PENDING/PAID/SHIPPED/REFUNDED/CANCELLED, facturation Int).
 */
export default async function AdminOrdersStubPage() {
	await assertAdminPage();

	return (
		<>
			<PageHeader variant="compact" title="Commandes" />
			<p className="text-muted-foreground max-w-prose text-sm">
				La gestion des commandes est indisponible pendant la migration vers le nouveau schéma
				(réécriture au lot 4). Les commandes existantes restent visibles dans le dashboard Stripe.
			</p>
		</>
	);
}
