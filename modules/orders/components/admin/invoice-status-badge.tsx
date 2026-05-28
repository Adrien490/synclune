import type { InvoiceStatus } from "@/app/generated/prisma/enums";
import { Badge } from "@/shared/components/ui/badge";
import {
	INVOICE_STATUS_LABELS,
	INVOICE_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";

interface InvoiceStatusBadgeProps {
	status: InvoiceStatus;
	className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
	const label = INVOICE_STATUS_LABELS[status];
	return (
		<Badge
			variant={INVOICE_STATUS_VARIANTS[status]}
			className={className}
			role="status"
			aria-label={`Statut de la facture : ${label}`}
		>
			{label}
		</Badge>
	);
}
