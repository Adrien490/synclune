import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { CHART_STYLES } from "../constants/chart-styles";

export interface KpiEvolutionProps {
	evolution: number;
	comparisonLabel?: string;
	/** Invert color logic: negative = good (green), positive = bad (red). Useful for metrics like delivery time. */
	invertColors?: boolean;
}

/**
 * Displays KPI evolution with arrow and percentage
 */
export function KpiEvolution({
	evolution,
	comparisonLabel,
	invertColors = false,
}: KpiEvolutionProps) {
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
