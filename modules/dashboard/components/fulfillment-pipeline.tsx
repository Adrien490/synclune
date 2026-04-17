"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
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
 * Mobile: flat section (no Card chrome). Desktop: full Card with shadow.
 */
export function FulfillmentPipelineCard({ pipeline }: FulfillmentPipelineProps) {
	const isMobile = useIsMobile();
	const total =
		pipeline.unfulfilled +
		pipeline.processing +
		pipeline.shipped +
		pipeline.delivered +
		pipeline.returned;

	if (total === 0) return null;

	return (
		<section
			className={cn(
				"space-y-3",
				"md:border-primary/30 md:from-primary/5 md:can-hover:hover:shadow-lg md:rounded-xl md:border-l-4 md:bg-linear-to-br md:to-transparent md:p-6 md:shadow-md md:transition-all md:duration-300",
			)}
			aria-labelledby="fulfillment-pipeline-title"
		>
			<header className="flex items-center justify-between gap-2">
				<div>
					<h3
						id="fulfillment-pipeline-title"
						className={cn(CHART_STYLES.title, "text-base md:text-xl")}
					>
						Pipeline d'expédition
					</h3>
					<p className="text-muted-foreground text-xs md:text-sm">
						{total} commande{total > 1 ? "s" : ""} payée{total > 1 ? "s" : ""}
					</p>
				</div>
				{pipeline.lateShipments > 0 && (
					<Link
						href="/admin/ventes/commandes?filter_fulfillmentStatus=UNFULFILLED"
						onClick={() => triggerHaptic("medium")}
						className="inline-flex items-center gap-1.5"
					>
						<Badge variant="destructive" className="gap-1">
							<AlertTriangle className="h-3 w-3" aria-hidden="true" />
							{pipeline.lateShipments} en retard
						</Badge>
					</Link>
				)}
			</header>

			{/* Segmented bar — visual only on mobile (segments too small for WCAG 2.5.5),
			    clickable on desktop where segments naturally reach 44px+ */}
			<div
				className="flex h-5 w-full overflow-hidden rounded-full sm:h-3"
				role="img"
				aria-label={`Pipeline: ${STAGES.map((s) => `${pipeline[s.key]} ${s.label.toLowerCase()}`).join(", ")}`}
			>
				{STAGES.map((stage) => {
					const count = pipeline[stage.key];
					if (count === 0) return null;
					const percent = (count / total) * 100;
					if (isMobile) {
						return (
							<div
								key={stage.key}
								className={cn(stage.color, "transition-all duration-500")}
								style={{ width: `${percent}%` }}
								aria-hidden="true"
							/>
						);
					}
					return (
						<Link
							key={stage.key}
							href={`/admin/ventes/commandes?${stage.filter}`}
							onClick={() => triggerHaptic("light")}
							className={cn(stage.color, "transition-all duration-500")}
							style={{ width: `${percent}%` }}
							aria-label={`${count} ${stage.label.toLowerCase()}`}
						/>
					);
				})}
			</div>

			{/* Legend with counts — primary interactive surface on mobile (44px rows) */}
			<div className={cn("flex flex-wrap gap-x-4 gap-y-1", isMobile && "gap-x-2 gap-y-1.5")}>
				{STAGES.map((stage) => {
					const count = pipeline[stage.key];
					if (count === 0) return null;
					return (
						<Link
							key={stage.key}
							href={`/admin/ventes/commandes?${stage.filter}`}
							onClick={() => triggerHaptic("light")}
							className={cn(
								"hover:text-foreground text-muted-foreground flex items-center gap-1.5 text-xs transition-colors",
								isMobile
									? "bg-muted/40 hover:bg-muted min-h-11 rounded-full px-3 py-2 text-sm"
									: "py-1",
							)}
						>
							<span className={cn("h-2.5 w-2.5 rounded-full", stage.color)} aria-hidden="true" />
							<span className="font-medium">
								{count} {stage.label.toLowerCase()}
							</span>
						</Link>
					);
				})}
			</div>
		</section>
	);
}
