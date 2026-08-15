import type { RetractationStatus } from "@/app/generated/prisma/client";
import { Badge } from "@/shared/components/ui/badge";
import {
	RETRACTATION_STATUS_BADGE_VARIANTS,
	RETRACTATION_STATUS_LABELS,
} from "../../constants/retractation.constants";

export function RetractationStatusBadge({ status }: { status: RetractationStatus }) {
	return (
		<Badge variant={RETRACTATION_STATUS_BADGE_VARIANTS[status]}>
			{RETRACTATION_STATUS_LABELS[status]}
		</Badge>
	);
}
