import { ArrowDown, ArrowUp, Info } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { CHART_STYLES } from "../constants/chart-styles";
import { LOW_VOLUME_THRESHOLD } from "../constants/dashboard.constants";

interface KpiEvolutionProps {
	evolution: number;
	comparisonLabel?: string;
	/** Invert color logic: negative = good (green), positive = bad (red). Useful for metrics like delivery time. */
	invertColors?: boolean;
	/**
	 * Volume of the previous comparison period (e.g. orders count). When below
	 * `LOW_VOLUME_THRESHOLD`, the percentage is hidden behind a "Données limitées"
	 * badge to avoid misleading deltas at micro-entreprise volumes.
	 */
	previousVolume?: number;
}

export function KpiEvolution({
	evolution,
	comparisonLabel,
	invertColors = false,
	previousVolume,
}: KpiEvolutionProps) {
	const isLowVolume = previousVolume !== undefined && previousVolume < LOW_VOLUME_THRESHOLD;

	if (isLowVolume) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						variant="outline"
						className="text-muted-foreground gap-1 text-xs font-normal"
						aria-label="Comparaison non significative — données insuffisantes"
					>
						<Info className="h-3 w-3" aria-hidden="true" />
						Données limitées
					</Badge>
				</TooltipTrigger>
				<TooltipContent side="top" className="max-w-xs">
					<p className="text-sm">
						Volume insuffisant sur la période précédente ({previousVolume} commande
						{previousVolume > 1 ? "s" : ""}) pour calculer une évolution fiable.
					</p>
				</TooltipContent>
			</Tooltip>
		);
	}

	const isPositive = evolution >= 0;
	const isGood = invertColors ? !isPositive : isPositive;

	return (
		<div className="flex items-center gap-1.5">
			<div
				className={cn(
					"flex items-center text-xs font-medium",
					isGood ? CHART_STYLES.evolution.positive : CHART_STYLES.evolution.negative,
				)}
				aria-label={`${isPositive ? "En hausse" : "En baisse"} de ${Math.abs(evolution).toFixed(1)} pourcent`}
			>
				{isPositive ? (
					<ArrowUp className="mr-0.5 h-3 w-3" aria-hidden="true" />
				) : (
					<ArrowDown className="mr-0.5 h-3 w-3" aria-hidden="true" />
				)}
				<span className="font-semibold">{Math.abs(evolution).toFixed(1)}%</span>
			</div>
			{comparisonLabel && <span className="text-muted-foreground text-xs">{comparisonLabel}</span>}
		</div>
	);
}
