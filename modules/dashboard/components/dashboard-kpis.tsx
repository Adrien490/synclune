import { use } from "react";
import Link from "next/link";

import { ORDER_STATUS_LABELS } from "@/modules/orders/constants/order.constants";
import { ORDERS_TO_SHIP_HREF } from "@/modules/orders/constants/to-ship";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatEuro } from "@/shared/utils/format-euro";

import type { DashboardKpis as DashboardKpisData } from "../data/get-dashboard-kpis";
import { VatProgressCard } from "./vat-progress-card";

function KpiCard({
	title,
	value,
	hint,
	href,
}: {
	title: string;
	value: string;
	hint?: string;
	href?: string;
}) {
	const body = (
		<>
			<p className="text-muted-foreground text-sm">{title}</p>
			<p className="font-display mt-1 text-3xl font-normal tracking-tight">{value}</p>
			{hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
		</>
	);

	if (href) {
		return (
			<Link
				href={href}
				className="bg-card focus-visible:ring-ring can-hover:hover:border-ring/70 block rounded-xl border p-5 transition-colors outline-none focus-visible:ring-2"
			>
				{body}
			</Link>
		);
	}
	return <div className="bg-card rounded-xl border p-5">{body}</div>;
}

/**
 * KPI du tableau de bord — schéma lean (lot 6). Quatre chiffres qui
 * répondent chacun à une question de Léane : « combien j'ai vendu ce
 * mois-ci ? », « qu'est-ce que je dois expédier ? », « quelles pièces
 * refaire ? », « qui attend un remboursement ? » — plus le suivi du seuil
 * de franchise TVA.
 */
export function DashboardKpis({ kpisPromise }: { kpisPromise: Promise<DashboardKpisData | null> }) {
	const kpis = use(kpisPromise);

	if (!kpis) {
		return (
			<p className="text-muted-foreground text-sm">
				Les indicateurs sont indisponibles pour le moment. Recharge la page.
			</p>
		);
	}

	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<KpiCard
					title="CA encaissé ce mois-ci"
					value={formatEuro(kpis.monthRevenueCents)}
					hint={`${kpis.monthOrdersCount} commande${kpis.monthOrdersCount > 1 ? "s" : ""} encaissée${kpis.monthOrdersCount > 1 ? "s" : ""}`}
				/>
				<KpiCard
					title="À expédier"
					value={String(kpis.ordersByStatus.PAID)}
					hint="Commandes payées en attente d'envoi"
					href={ORDERS_TO_SHIP_HREF}
				/>
				<KpiCard
					title="Stock faible"
					value={String(kpis.lowStockCount)}
					hint="Variantes actives à 0 ou 1 exemplaire"
					href="/admin/catalogue/produits"
				/>
				<KpiCard
					title="Rétractations en cours"
					value={String(kpis.openRetractationsCount)}
					hint="Demandes à traiter (délai légal de 14 j)"
					href="/admin/ventes/retractations"
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<VatProgressCard
					yearRevenueCents={kpis.yearRevenueCents}
					franchiseThresholdCents={kpis.franchiseThresholdCents}
					majoredThresholdCents={kpis.majoredThresholdCents}
				/>

				<Card>
					<CardHeader>
						<CardTitle>Commandes par statut</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="space-y-2 text-sm">
							{(Object.keys(kpis.ordersByStatus) as Array<keyof typeof kpis.ordersByStatus>).map(
								(status) => (
									<div key={status} className="flex justify-between gap-4">
										<dt className="text-muted-foreground">{ORDER_STATUS_LABELS[status]}</dt>
										<dd className="font-medium">{kpis.ordersByStatus[status]}</dd>
									</div>
								),
							)}
						</dl>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
