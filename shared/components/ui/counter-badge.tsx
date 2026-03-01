import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import type { LucideIcon } from "lucide-react";

interface CounterBadgeProps {
	count: number;
	max: number;
	label: string;
	icon?: LucideIcon;
	className?: string;
}

function getColorClasses(percentage: number): string {
	if (percentage < 33) return "bg-success/20 text-success border-success/40 dark:bg-success/30";
	if (percentage < 66) return "bg-warning/20 text-warning border-warning/40 dark:bg-warning/30";
	if (percentage < 90)
		return "bg-warning/30 text-warning-foreground border-warning/50 dark:bg-warning/40";
	return "bg-destructive/20 text-destructive border-destructive/40 dark:bg-destructive/30";
}

export function CounterBadge({ count, max, label, icon: Icon, className }: CounterBadgeProps) {
	const percentage = (count / max) * 100;

	return (
		<Badge
			className={cn(
				"gap-1.5 border-2 px-3 py-1.5 text-sm font-semibold",
				getColorClasses(percentage),
				className,
			)}
			role="status"
			aria-live="polite"
			aria-atomic="true"
		>
			{Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
			<span>
				{count}/{max} {label}
			</span>
		</Badge>
	);
}
