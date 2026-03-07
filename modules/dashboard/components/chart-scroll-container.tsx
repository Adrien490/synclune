import { cn } from "@/shared/utils/cn";

interface ChartScrollContainerProps {
	children: React.ReactNode;
	/** Accessible label for the chart region */
	"aria-label"?: string;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Container for charts - forces responsive on mobile
 */
export function ChartScrollContainer({
	children,
	"aria-label": ariaLabel = "Zone de graphique",
	className,
}: ChartScrollContainerProps) {
	return (
		<div
			role="region"
			aria-label={ariaLabel}
			className={cn(
				"relative",
				"overflow-x-hidden overflow-y-visible",
				"md:overflow-visible",
				className,
			)}
		>
			<div className="w-full min-w-0">{children}</div>
		</div>
	);
}
