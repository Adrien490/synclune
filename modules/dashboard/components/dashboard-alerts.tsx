import { CalendarClock, RotateCcw } from "lucide-react";
import type { DashboardAlerts } from "@/modules/dashboard/data/get-alerts";
import {
	URSSAF_ALERT_THRESHOLD_DAYS,
	type UrssafDeadline,
} from "@/modules/dashboard/services/urssaf-deadline.service";
import { DashboardAlertLink } from "./dashboard-alert-link";

interface DashboardAlertsProps {
	alerts: DashboardAlerts;
	urssafDeadline?: UrssafDeadline | null;
}

/**
 * Actionable alerts banner for the dashboard.
 * Renders 2 types of alerts when relevant: pending refunds,
 * URSSAF declaration deadline. VAT threshold is surfaced by
 * VatProgressCard in the "Conformité fiscale" section.
 */
export function DashboardAlerts({ alerts, urssafDeadline }: DashboardAlertsProps) {
	const { pendingRefunds } = alerts;

	const urssafAlert =
		urssafDeadline &&
		urssafDeadline.daysUntil >= 0 &&
		urssafDeadline.daysUntil <= URSSAF_ALERT_THRESHOLD_DAYS
			? urssafDeadline
			: null;

	const hasAlerts = pendingRefunds > 0 || urssafAlert !== null;

	if (!hasAlerts) return null;

	return (
		<div
			className="flex flex-wrap gap-3"
			role="region"
			aria-label="Alertes nécessitant ton attention"
		>
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
