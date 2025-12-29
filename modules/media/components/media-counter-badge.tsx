import { CounterBadge } from "@/shared/components/ui/counter-badge";
import { Images } from "lucide-react";

interface MediaCounterBadgeProps {
	count: number;
	max: number;
	className?: string;
}

export function MediaCounterBadge({
	count,
	max,
	className,
}: MediaCounterBadgeProps) {
	return (
		<CounterBadge
			count={count}
			max={max}
			label="images"
			icon={Images}
			className={className}
		/>
	);
}
