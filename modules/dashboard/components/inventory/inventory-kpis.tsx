"use client";

import { use } from "react";
import { PackageX, AlertTriangle, Wallet, Bell } from "lucide-react";
import { KpiCard } from "../kpi-card";
import type { InventoryKpisReturn } from "../../types/dashboard.types";

interface InventoryKpisProps {
	kpisPromise: Promise<InventoryKpisReturn>;
}

/**
 * KPIs de la section Inventaire
 */
export function InventoryKpis({ kpisPromise }: InventoryKpisProps) {
	const kpis = use(kpisPromise);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<KpiCard
				title="En rupture"
				value=""
				numericValue={kpis.outOfStock.count}
				subtitle="SKUs sans stock"
				icon={<PackageX className="h-4 w-4" />}
				variant={kpis.outOfStock.count > 0 ? "danger" : "default"}
			/>
			<KpiCard
				title="Stock bas"
				value=""
				numericValue={kpis.lowStock.count}
				subtitle={`< ${kpis.lowStock.threshold} unites`}
				icon={<AlertTriangle className="h-4 w-4" />}
				variant={kpis.lowStock.count > 0 ? "warning" : "default"}
			/>
			<KpiCard
				title="Valeur du stock"
				value=""
				numericValue={kpis.stockValue.amount / 100}
				suffix=" €"
				decimalPlaces={2}
				subtitle={`${kpis.stockValue.totalUnits} unites`}
				icon={<Wallet className="h-4 w-4" />}
			/>
			<KpiCard
				title="Demandes retour stock"
				value=""
				numericValue={kpis.stockNotifications.pendingCount}
				subtitle="en attente"
				icon={<Bell className="h-4 w-4" />}
				variant={kpis.stockNotifications.pendingCount > 0 ? "info" : "default"}
			/>
		</div>
	);
}
