import { CounterBadge } from "@/shared/components/ui/counter-badge";
import { ImagesIcon } from "@phosphor-icons/react/ssr";

interface MediaCounterBadgeProps {
	count: number;
	max: number;
	className?: string;
}

export function MediaCounterBadge({ count, max, className }: MediaCounterBadgeProps) {
	return (
		<CounterBadge count={count} max={max} label="médias" icon={ImagesIcon} className={className} />
	);
}
