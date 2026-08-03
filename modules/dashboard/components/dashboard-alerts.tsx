import { AlertTriangle, CalendarClock, Clock, RotateCcw } from "lucide-react";
import type {
	DashboardActionItems,
	DashboardAlerts as DashboardAlertsData,
} from "@/modules/dashboard/types/dashboard.types";
import {
	URSSAF_ALERT_THRESHOLD_DAYS,
	type UrssafDeadline,
} from "@/modules/dashboard/services/urssaf-deadline.service";
import { DashboardAlertLink } from "./dashboard-alert-link";

interface DashboardAlertsProps {
	alerts: DashboardAlertsData;
	/** Compteurs « à traiter » (audit §4.2 — remplacent les crons d'alerte retirés). */
	actionItems?: DashboardActionItems;
	urssafDeadline?: UrssafDeadline | null;
}

type ActionItemDescriptor = {
	key: keyof DashboardActionItems;
	href: string;
	icon: "alert" | "clock";
	label: (n: number) => string;
};

// Descripteurs des éléments « à traiter ». L'ordre = priorité d'affichage.
const ACTION_ITEMS: readonly ActionItemDescriptor[] = [
	{
		key: "overbilledOrders",
		href: "/admin/ventes/commandes",
		icon: "alert",
		label: (n) => `${n} commande${n > 1 ? "s" : ""} sur-facturée${n > 1 ? "s" : ""}`,
	},
	{
		key: "stuckInvoices",
		href: "/admin/ventes/facturation",
		icon: "alert",
		label: (n) => `${n} facture${n > 1 ? "s" : ""} manquante${n > 1 ? "s" : ""} (+7 j)`,
	},
	{
		key: "stuckProcessing",
		href: "/admin/ventes/commandes?filter_status=PROCESSING",
		icon: "clock",
		label: (n) => `${n} commande${n > 1 ? "s" : ""} en préparation depuis +7 j`,
	},
	{
		key: "stuckShipped",
		href: "/admin/ventes/commandes?filter_status=SHIPPED",
		icon: "clock",
		label: (n) =>
			`${n} commande${n > 1 ? "s" : ""} expédiée${n > 1 ? "s" : ""} sans livraison +14 j`,
	},
	{
		key: "orphanPending",
		href: "/admin/ventes/commandes?filter_paymentStatus=PENDING",
		icon: "clock",
		label: (n) => `${n} paiement${n > 1 ? "s" : ""} en attente bloqué${n > 1 ? "s" : ""} (+14 j)`,
	},
];

/**
 * Actionable alerts banner for the dashboard.
 * Renders, when relevant: URSSAF declaration deadline, pending refunds, and the
 * « à traiter » action items (litiges, sur-facturation, commandes/factures/paiements
 * bloqués) qui remplacent les crons d'alerte retirés à l'audit (§4.2). VAT threshold
 * is surfaced by VatProgressCard in the "Conformité fiscale" section.
 */
export function DashboardAlerts({ alerts, actionItems, urssafDeadline }: DashboardAlertsProps) {
	const { refundsNeedingAttention } = alerts;

	const urssafAlert =
		urssafDeadline &&
		urssafDeadline.daysUntil >= 0 &&
		urssafDeadline.daysUntil <= URSSAF_ALERT_THRESHOLD_DAYS
			? urssafDeadline
			: null;

	const activeActionItems = actionItems
		? ACTION_ITEMS.map((descriptor) => ({
				...descriptor,
				count: actionItems[descriptor.key],
			})).filter((item) => item.count > 0)
		: [];

	const hasAlerts =
		refundsNeedingAttention > 0 || urssafAlert !== null || activeActionItems.length > 0;

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

			{refundsNeedingAttention > 0 && (
				<DashboardAlertLink
					href="/admin/ventes/remboursements"
					tone="warning"
					icon={<RotateCcw className="text-warning size-4" aria-hidden="true" />}
				>
					{refundsNeedingAttention} remboursement{refundsNeedingAttention > 1 ? "s" : ""} à
					rattraper — lance « Réconcilier » depuis la page Maintenance
				</DashboardAlertLink>
			)}

			{activeActionItems.map((item) => (
				<DashboardAlertLink
					key={item.key}
					href={item.href}
					tone="warning"
					icon={
						item.icon === "alert" ? (
							<AlertTriangle className="text-warning size-4" aria-hidden="true" />
						) : (
							<Clock className="text-warning size-4" aria-hidden="true" />
						)
					}
				>
					{item.label(item.count)}
				</DashboardAlertLink>
			))}
		</div>
	);
}
