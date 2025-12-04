import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import { Images } from "lucide-react";

interface ImageCounterBadgeProps {
	count: number;
	max: number;
	className?: string;
}

export function ImageCounterBadge({
	count,
	max,
	className,
}: ImageCounterBadgeProps) {
	const percentage = (count / max) * 100;

	const getColorClasses = () => {
		if (percentage < 33)
			return "bg-green-500/20 text-green-800 border-green-400 dark:bg-green-500/30 dark:text-green-300 dark:border-green-600";
		if (percentage < 66)
			return "bg-yellow-500/20 text-yellow-800 border-yellow-400 dark:bg-yellow-500/30 dark:text-yellow-300 dark:border-yellow-600";
		if (percentage < 90)
			return "bg-orange-500/20 text-orange-800 border-orange-400 dark:bg-orange-500/30 dark:text-orange-300 dark:border-orange-600";
		return "bg-red-500/20 text-red-800 border-red-400 dark:bg-red-500/30 dark:text-red-300 dark:border-red-600";
	};

	return (
		<Badge
			className={cn(
				"gap-1.5 text-sm font-semibold px-3 py-1.5 border-2",
				getColorClasses(),
				className
			)}
			role="status"
			aria-live="polite"
			aria-atomic="true"
		>
			<Images className="h-4 w-4" aria-hidden="true" />
			<span>
				{count}/{max} images
			</span>
		</Badge>
	);
}
