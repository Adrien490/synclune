import { CalendarClock, Receipt, RotateCcw } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import type { DashboardAlerts } from "@/modules/dashboard/data/get-alerts";
import type { GetVatProgressReturn } from "@/modules/dashboard/data/get-vat-progress";
import { VAT_PROGRESS_ALERT_THRESHOLD } from "@/modules/dashboard/data/get-vat-progress";
import {
	URSSAF_ALERT_THRESHOLD_DAYS,
	type UrssafDeadline,
} from "@/modules/dashboard/services/urssaf-deadline.service";
import { DashboardAlertLink } from "./dashboard-alert-link";

interface DashboardAlertsProps {
	alerts: DashboardAlerts;
	vatProgress?: GetVatProgressReturn | null;
	urssafDeadline?: UrssafDeadline | null;
}

/**
 * Actionable alerts banner for the dashboard.
 * Renders 3 types of alerts when relevant: pending refunds,
 * VAT threshold proximity, URSSAF declaration deadline.
 */
export function DashboardAlerts({ alerts, vatProgress, urssafDeadline }: DashboardAlertsProps) {
	const { pendingRefunds } = alerts;

	const vatAlert =
		vatProgress && vatProgress.progress >= VAT_PROGRESS_ALERT_THRESHOLD ? vatProgress : null;
	const vatExceeded = vatAlert ? vatAlert.progress >= 100 : false;

	const urssafAlert =
		urssafDeadline &&
		urssafDeadline.daysUntil >= 0 &&
		urssafDeadline.daysUntil <= URSSAF_ALERT_THRESHOLD_DAYS
			? urssafDeadline
			: null;

	const hasAlerts = pendingRefunds > 0 || vatAlert !== null || urssafAlert !== null;

	if (!hasAlerts) return null;

	return (
		<div
			className="flex flex-wrap gap-3"
			role="status"
			aria-label="Alertes nécessitant votre attention"
		>
			{vatAlert && (
				<div
					className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
						vatExceeded
							? "border-destructive/30 bg-destructive/5"
							: "border-warning/30 bg-warning/5"
					}`}
				>
					<Receipt
						className={vatExceeded ? "text-destructive size-4" : "text-warning size-4"}
						aria-hidden="true"
					/>
					<span className="font-medium">
						Seuil TVA {vatAlert.year} atteint à {vatAlert.progress.toFixed(0)} %
					</span>
					{vatExceeded && (
						<Badge variant="destructive" className="text-xs">
							Bascule TVA
						</Badge>
					)}
				</div>
			)}

			{urssafAlert && (
				<DashboardAlertLink
					href="https://www.autoentrepreneur.urssaf.fr"
					external
					tone="info"
					icon={<CalendarClock className="text-info size-4" aria-hidden="true" />}
				>
					Déclaration URSSAF {urssafAlert.quarterLabel} dans {urssafAlert.daysUntil} jour
					{urssafAlert.daysUntil > 1 ? "s" : ""}
				</DashboardAlertLink>
			)}

			{pendingRefunds > 0 && (
				<DashboardAlertLink
					href="/admin/ventes/remboursements?filter_status=PENDING"
					tone="warning"
					icon={<RotateCcw className="text-warning size-4" aria-hidden="true" />}
				>
					{pendingRefunds} remboursement{pendingRefunds > 1 ? "s" : ""} en attente
				</DashboardAlertLink>
			)}
		</div>
	);
}
