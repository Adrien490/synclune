import Link from "next/link";
import { ArrowRight, Mail, ShoppingCart, TrendingUp } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import type { GetCartAbandonmentReturn } from "@/modules/dashboard/data/get-cart-abandonment";
import { CHART_STYLES } from "../constants/chart-styles";
import { KpiEvolution } from "./kpi-evolution";

interface CartAbandonmentCardProps {
	data: GetCartAbandonmentReturn;
	comparisonLabel?: string;
}

/**
 * Cart abandonment & recovery widget
 * Displays active carts (snapshot value), recovery emails sent and recovery conversion rate
 */
export function CartAbandonmentCard({
	data,
	comparisonLabel = "vs mois dernier",
}: CartAbandonmentCardProps) {
	const hasActiveCarts = data.activeCarts.count > 0;
	const hasEmailsSent = data.abandonedEmailsSent.count > 0;

	return (
		<Card
			className={cn(CHART_STYLES.card, "can-hover:hover:shadow-lg transition-all duration-300")}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between gap-2">
					<div>
						<CardTitle className={CHART_STYLES.title}>Paniers & récupération</CardTitle>
						<CardDescription className="text-sm">
							Suivi des paniers abandonnés et taux de conversion des relances
						</CardDescription>
					</div>
					<Link
						href="/admin/ventes/commandes"
						className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
						aria-label="Voir les commandes"
					>
						<span className="hidden sm:inline">Commandes</span>
						<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<MetricBlock
						icon={<ShoppingCart className="h-4 w-4" aria-hidden="true" />}
						label="Paniers actifs"
						value={hasActiveCarts ? data.activeCarts.count.toString() : "0"}
						subtitle={
							hasActiveCarts
								? `${formatEuro(data.activeCarts.totalValue, { compact: true })} potentiel`
								: "Aucun panier en attente"
						}
					/>

					<MetricBlock
						icon={<Mail className="h-4 w-4" aria-hidden="true" />}
						label="Relances envoyées"
						value={data.abandonedEmailsSent.count.toString()}
						subtitle={
							hasEmailsSent ? (
								<KpiEvolution
									evolution={data.abandonedEmailsSent.evolution}
									comparisonLabel={comparisonLabel}
								/>
							) : (
								"Aucun email envoyé"
							)
						}
					/>

					<MetricBlock
						icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
						label="Taux de récupération"
						value={hasEmailsSent ? `${data.recoveryRate.rate.toFixed(1)} %` : "—"}
						subtitle={
							hasEmailsSent
								? `${data.recoveryRate.recoveredCount} récupéré${data.recoveryRate.recoveredCount > 1 ? "s" : ""}`
								: "Données insuffisantes"
						}
						highlight={hasEmailsSent && data.recoveryRate.rate >= 10}
					/>
				</div>
			</CardContent>
		</Card>
	);
}

interface MetricBlockProps {
	icon: React.ReactNode;
	label: string;
	value: string;
	subtitle: React.ReactNode;
	highlight?: boolean;
}

function MetricBlock({ icon, label, value, subtitle, highlight }: MetricBlockProps) {
	return (
		<div
			className={cn(
				"rounded-lg border p-4 transition-colors",
				highlight ? "border-success/30 bg-success/5" : "border-border bg-muted/30",
			)}
		>
			<div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium">
				{icon}
				<span>{label}</span>
			</div>
			<div className="text-foreground mb-0.5 text-2xl font-semibold tabular-nums">{value}</div>
			<div className="text-muted-foreground text-xs">{subtitle}</div>
		</div>
	);
}
