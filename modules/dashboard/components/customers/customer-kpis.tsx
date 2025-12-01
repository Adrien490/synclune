"use client";

import { use } from "react";
import { Users, UserPlus, Repeat, ShoppingCart } from "lucide-react";
import { KpiCard } from "../kpi-card";
import type { CustomerKpisReturn } from "../../types/dashboard.types";

interface CustomerKpisProps {
	kpisPromise: Promise<CustomerKpisReturn>;
}

/**
 * KPIs de la section Clients
 */
export function CustomerKpis({ kpisPromise }: CustomerKpisProps) {
	const kpis = use(kpisPromise);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<KpiCard
				title="Clients totaux"
				value=""
				numericValue={kpis.totalCustomers.count}
				evolution={kpis.totalCustomers.evolution}
				subtitle="avec au moins 1 commande"
				icon={<Users className="h-4 w-4" />}
			/>
			<KpiCard
				title="Nouveaux clients"
				value=""
				numericValue={kpis.newCustomers.count}
				evolution={kpis.newCustomers.evolution}
				subtitle="sur la periode"
				icon={<UserPlus className="h-4 w-4" />}
			/>
			<KpiCard
				title="Taux de recurrence"
				value=""
				numericValue={kpis.repeatRate.rate}
				suffix=" %"
				decimalPlaces={1}
				evolution={kpis.repeatRate.evolution}
				subtitle="clients avec 2+ commandes"
				icon={<Repeat className="h-4 w-4" />}
			/>
			<KpiCard
				title="Panier 1ere commande"
				value=""
				numericValue={kpis.firstOrderAov.amount / 100}
				suffix=" €"
				decimalPlaces={2}
				subtitle={`vs ${(kpis.firstOrderAov.repeatAov / 100).toFixed(2)} € recurrents`}
				icon={<ShoppingCart className="h-4 w-4" />}
			/>
		</div>
	);
}
