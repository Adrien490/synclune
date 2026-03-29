import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import type { FulfillmentPipeline } from "@/modules/dashboard/data/get-fulfillment-pipeline";
import { CHART_STYLES } from "../constants/chart-styles";

interface FulfillmentPipelineProps {
	pipeline: FulfillmentPipeline;
}

const STAGES = [
	{
		key: "unfulfilled" as const,
		label: "À préparer",
		color: "bg-warning",
		filter: "filter_fulfillmentStatus=UNFULFILLED",
	},
	{
		key: "processing" as const,
		label: "En préparation",
		color: "bg-info",
		filter: "filter_fulfillmentStatus=PROCESSING",
	},
	{
		key: "shipped" as const,
		label: "Expédiées",
		color: "bg-secondary",
		filter: "filter_fulfillmentStatus=SHIPPED",
	},
	{
		key: "delivered" as const,
		label: "Livrées",
		color: "bg-success",
		filter: "filter_fulfillmentStatus=DELIVERED",
	},
	{
		key: "returned" as const,
		label: "Retournées",
		color: "bg-destructive",
		filter: "filter_fulfillmentStatus=RETURNED",
	},
] as const;

/**
 * Horizontal segmented bar showing order fulfillment pipeline
 * Each segment is clickable and links to filtered orders list
 */
export function FulfillmentPipelineCard({ pipeline }: FulfillmentPipelineProps) {
	const total =
		pipeline.unfulfilled +
		pipeline.processing +
		pipeline.shipped +
		pipeline.delivered +
		pipeline.returned;

	if (total === 0) return null;

	return (
		<Card
			className={cn(CHART_STYLES.card, "can-hover:hover:shadow-lg transition-all duration-300")}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className={CHART_STYLES.title}>Pipeline d'expédition</CardTitle>
						<CardDescription className="text-sm">
							{total} commande{total > 1 ? "s" : ""} payée{total > 1 ? "s" : ""}
						</CardDescription>
					</div>
					{pipeline.lateShipments > 0 && (
						<Link
							href="/admin/ventes/commandes?filter_fulfillmentStatus=UNFULFILLED"
							className="inline-flex items-center gap-1.5"
						>
							<Badge variant="destructive" className="gap-1">
								<AlertTriangle className="h-3 w-3" aria-hidden="true" />
								{pipeline.lateShipments} en retard
							</Badge>
						</Link>
					)}
				</div>
			</CardHeader>
			<CardContent>
				{/* Segmented bar */}
				<div
					className="flex h-5 w-full overflow-hidden rounded-full sm:h-3"
					role="img"
					aria-label={`Pipeline: ${STAGES.map((s) => `${pipeline[s.key]} ${s.label.toLowerCase()}`).join(", ")}`}
				>
					{STAGES.map((stage) => {
						const count = pipeline[stage.key];
						if (count === 0) return null;
						const percent = (count / total) * 100;
						return (
							<Link
								key={stage.key}
								href={`/admin/ventes/commandes?${stage.filter}`}
								className={cn(stage.color, "transition-all duration-500")}
								style={{ width: `${percent}%` }}
								aria-label={`${count} ${stage.label.toLowerCase()}`}
							/>
						);
					})}
				</div>

				{/* Legend with counts */}
				<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
					{STAGES.map((stage) => {
						const count = pipeline[stage.key];
						if (count === 0) return null;
						return (
							<Link
								key={stage.key}
								href={`/admin/ventes/commandes?${stage.filter}`}
								className="hover:text-foreground text-muted-foreground flex items-center gap-1.5 py-1 text-xs transition-colors"
							>
								<span className={cn("h-2.5 w-2.5 rounded-full", stage.color)} aria-hidden="true" />
								<span className="font-medium">
									{count} {stage.label.toLowerCase()}
								</span>
							</Link>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
