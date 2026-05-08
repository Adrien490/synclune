import Link from "next/link";
import { ExternalLink, Receipt } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { formatDateShort } from "@/shared/utils/dates";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	REFUND_REASON_LABELS,
	REFUND_STATUS_LABELS,
	REFUND_STATUS_VARIANTS,
} from "../../constants/refund.constants";
import type { GetRefundReturn } from "../../types/refund.types";

import { RefundActionsClient } from "./refund-actions-client";

interface RefundDetailPageProps {
	refund: NonNullable<GetRefundReturn>;
}

export function RefundDetailPage({ refund }: RefundDetailPageProps) {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<header className="space-y-2">
				<div className="space-y-1">
					<h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
						<Receipt className="size-6" aria-hidden="true" />
						Remboursement
					</h1>
					<p className="text-muted-foreground text-sm">
						Commande{" "}
						<Link
							href={`/admin/ventes/commandes/${refund.order.id}`}
							className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
						>
							{refund.order.orderNumber}
							<ExternalLink className="size-3" aria-hidden="true" />
						</Link>
					</p>
				</div>
			</header>

			<Separator />

			<section>
				<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
					<dt className="text-muted-foreground">Commande</dt>
					<dd className="font-medium">{refund.order.orderNumber}</dd>
					<dt className="text-muted-foreground">Client</dt>
					<dd className="truncate">{refund.order.customerName || refund.order.customerEmail}</dd>
					<dt className="text-muted-foreground">Email</dt>
					<dd className="truncate">{refund.order.customerEmail}</dd>
					<dt className="text-muted-foreground">Motif</dt>
					<dd>{REFUND_REASON_LABELS[refund.reason]}</dd>
					<dt className="text-muted-foreground">Montant</dt>
					<dd className="font-medium">{formatEuro(refund.amount)}</dd>
					<dt className="text-muted-foreground">Statut</dt>
					<dd>
						<Badge
							variant={REFUND_STATUS_VARIANTS[refund.status]}
							style={{ viewTransitionName: `refund-status-${refund.id}` }}
						>
							{REFUND_STATUS_LABELS[refund.status]}
						</Badge>
					</dd>
					<dt className="text-muted-foreground">Créé le</dt>
					<dd>{formatDateShort(refund.createdAt)}</dd>
					{refund.note ? (
						<>
							<dt className="text-muted-foreground">Note admin</dt>
							<dd className="text-pretty whitespace-pre-wrap">{refund.note}</dd>
						</>
					) : null}
				</dl>
			</section>

			<Separator />

			<RefundActionsClient
				refund={{
					id: refund.id,
					status: refund.status,
					amount: refund.amount,
					orderId: refund.order.id,
					orderNumber: refund.order.orderNumber,
				}}
			/>
		</div>
	);
}
