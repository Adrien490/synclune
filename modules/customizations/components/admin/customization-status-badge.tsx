import type { CustomizationRequestStatus } from "../../types/customization.types";
import {
	CUSTOMIZATION_STATUS_LABELS,
	CUSTOMIZATION_STATUS_COLORS,
} from "../../constants/status.constants";
import { cn } from "@/shared/utils/cn";

interface CustomizationStatusBadgeProps {
	status: CustomizationRequestStatus;
	className?: string;
}

export function CustomizationStatusBadge({ status, className }: CustomizationStatusBadgeProps) {
	const label = CUSTOMIZATION_STATUS_LABELS[status];
	const colors = CUSTOMIZATION_STATUS_COLORS[status];

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
				colors.bg,
				colors.text,
				className,
			)}
		>
			<span aria-hidden="true">{colors.symbol}</span>
			{label}
		</span>
	);
}
