import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";

const counterBadgeVariants = cva("gap-1.5 border-2 px-3 py-1.5 text-sm font-semibold", {
	variants: {
		status: {
			low: "bg-success/20 text-success border-success/40",
			medium: "bg-warning/20 text-warning border-warning/40",
			high: "bg-warning/30 text-warning-foreground border-warning/50",
			critical: "bg-destructive/20 text-destructive border-destructive/40",
		},
	},
	defaultVariants: {
		status: "low",
	},
});

function getStatus(percentage: number): VariantProps<typeof counterBadgeVariants>["status"] {
	if (percentage < 33) return "low";
	if (percentage < 66) return "medium";
	if (percentage < 90) return "high";
	return "critical";
}

interface CounterBadgeProps {
	count: number;
	max: number;
	label: string;
	icon?: LucideIcon;
	className?: string;
}

export function CounterBadge({ count, max, label, icon: Icon, className }: CounterBadgeProps) {
	const percentage = (count / max) * 100;

	return (
		<Badge
			className={cn(counterBadgeVariants({ status: getStatus(percentage) }), className)}
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

export { counterBadgeVariants };
