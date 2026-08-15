import { type Metadata } from "next";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Tableau de bord - Administration | Synclune",
	description: "Vue d'ensemble de ta boutique",
};

/**
 * STUB (migration lean, lot 2) — le dashboard (KPI, alertes, seuil TVA,
 * dernières commandes) est réécrit au lot 6 sur le schéma lean.
 */
export default async function AdminDashboardStubPage() {
	await assertAdminPage();

	return (
		<section aria-label="Tableau de bord" className="space-y-4">
			<h1 className="font-display text-2xl font-normal tracking-tight">Tableau de bord</h1>
			<p className="text-muted-foreground max-w-prose text-sm">
				Les indicateurs sont indisponibles pendant la migration vers le nouveau schéma (réécriture
				au lot 6). Le catalogue reste entièrement gérable depuis la section Catalogue.
			</p>
		</section>
	);
}
