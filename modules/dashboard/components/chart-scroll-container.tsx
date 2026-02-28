import { cn } from "@/shared/utils/cn";

interface ChartScrollContainerProps {
	children: React.ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Container for charts - forces responsive on mobile
 */
export function ChartScrollContainer({ children, className }: ChartScrollContainerProps) {
	return (
		<div
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
