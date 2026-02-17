import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { CHART_STYLES } from "../constants/chart-styles";

export interface KpiEvolutionProps {
	evolution: number;
	comparisonLabel?: string;
}

/**
 * Displays KPI evolution with arrow and percentage
 */
export function KpiEvolution({
	evolution,
	comparisonLabel,
}: KpiEvolutionProps) {
	const isPositive = evolution >= 0;

	return (
		<div className="flex items-center gap-1.5">
			<div
				className={cn(
					"flex items-center text-xs font-medium",
					isPositive
						? CHART_STYLES.evolution.positive
						: CHART_STYLES.evolution.negative,
				)}
				aria-label={`${isPositive ? "En hausse" : "En baisse"} de ${Math.abs(evolution).toFixed(1)} pourcent`}
			>
				{isPositive ? (
					<ArrowUp className="w-3 h-3 mr-0.5" aria-hidden="true" />
				) : (
					<ArrowDown
						className="w-3 h-3 mr-0.5"
						aria-hidden="true"
					/>
				)}
				<span className="font-semibold">
					{Math.abs(evolution).toFixed(1)}%
				</span>
			</div>
			{comparisonLabel && (
				<span className="text-xs text-muted-foreground">
					{comparisonLabel}
				</span>
			)}
		</div>
	);
}
