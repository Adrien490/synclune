import { AlertTriangle, PackageX, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import type { DashboardAlerts } from "@/modules/dashboard/data/get-alerts";

interface DashboardAlertsProps {
	alerts: DashboardAlerts;
}

/**
 * Actionable alerts banner for the dashboard
 * Only renders when there are items requiring attention
 */
export function DashboardAlerts({ alerts }: DashboardAlertsProps) {
	const { pendingRefunds, activeDisputes, lowStockSkus, pendingCustomizations } = alerts;

	const hasAlerts =
		pendingRefunds > 0 || activeDisputes > 0 || lowStockSkus > 0 || pendingCustomizations > 0;

	if (!hasAlerts) return null;

	return (
		<div
			className="flex flex-wrap gap-3"
			role="status"
			aria-label="Alertes necessitant votre attention"
		>
			{activeDisputes > 0 && (
				<Link
					href="/admin/ventes/litiges"
					className="focus-visible:ring-ring border-destructive/30 bg-destructive/5 hover:bg-destructive/10 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2"
				>
					<AlertTriangle className="text-destructive h-4 w-4" aria-hidden="true" />
					<span className="font-medium">
						{activeDisputes} litige{activeDisputes > 1 ? "s" : ""} Stripe
					</span>
					<Badge variant="destructive" className="text-xs">
						Urgent
					</Badge>
				</Link>
			)}

			{pendingRefunds > 0 && (
				<Link
					href="/admin/ventes/remboursements?filter_status=PENDING"
					className="focus-visible:ring-ring border-warning/30 bg-warning/5 hover:bg-warning/10 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2"
				>
					<RotateCcw className="text-warning h-4 w-4" aria-hidden="true" />
					<span className="font-medium">
						{pendingRefunds} remboursement{pendingRefunds > 1 ? "s" : ""} en attente
					</span>
				</Link>
			)}

			{pendingCustomizations > 0 && (
				<Link
					href="/admin/marketing/personnalisations?filter_status=PENDING"
					className="focus-visible:ring-ring border-primary/30 bg-primary/5 hover:bg-primary/10 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2"
				>
					<Sparkles className="text-primary h-4 w-4" aria-hidden="true" />
					<span className="font-medium">
						{pendingCustomizations} personnalisation{pendingCustomizations > 1 ? "s" : ""} en
						attente
					</span>
				</Link>
			)}

			{lowStockSkus > 0 && (
				<Link
					href="/admin/catalogue/produits?filter_stock=low"
					className="focus-visible:ring-ring text-muted-foreground hover:bg-accent inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2"
				>
					<PackageX className="h-4 w-4" aria-hidden="true" />
					<span className="font-medium">
						{lowStockSkus} SKU{lowStockSkus > 1 ? "s" : ""} stock bas
					</span>
				</Link>
			)}
		</div>
	);
}
