import { Bell, Mail, Package } from "lucide-react";
import type { StockNotificationsStats } from "../../data/get-stock-notifications-admin";

interface StockNotificationsStatsProps {
	stats: StockNotificationsStats;
}

export function StockNotificationsStatsCards({
	stats,
}: StockNotificationsStatsProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
			{/* Demandes en attente */}
			<div className="rounded-lg border bg-card p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							En attente
						</p>
						<p className="text-2xl font-bold mt-1">{stats.totalPending}</p>
					</div>
					<Bell className="h-8 w-8 text-muted-foreground" />
				</div>
			</div>

			{/* Notifications envoyées ce mois */}
			<div className="rounded-lg border bg-card p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							Envoyees ce mois
						</p>
						<p className="text-2xl font-bold mt-1">{stats.notifiedThisMonth}</p>
					</div>
					<Mail className="h-8 w-8 text-muted-foreground" />
				</div>
			</div>

			{/* SKUs avec demandes */}
			<div className="rounded-lg border bg-card p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-muted-foreground">
							Produits concernes
						</p>
						<p className="text-2xl font-bold mt-1">
							{stats.skusWithPendingRequests}
						</p>
					</div>
					<Package className="h-8 w-8 text-muted-foreground" />
				</div>
			</div>
		</div>
	);
}
