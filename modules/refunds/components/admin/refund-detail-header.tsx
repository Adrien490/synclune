"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowSquareOutIcon, ReceiptIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { formatEuro } from "@/shared/utils/format-euro";

import { REFUND_STATUS_LABELS, REFUND_STATUS_VARIANTS } from "../../constants/refund.constants";
import type { GetRefundReturn } from "../../types/refund.types";
import { useSetAdminPageTitle } from "@/app/admin/(protected)/_components/admin-page-title-context";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface RefundDetailHeaderProps {
	refund: NonNullable<GetRefundReturn>;
}

/**
 * En-tête du détail remboursement — consultation pure depuis le Lot 2 S3.3 :
 * le menu d'actions (approve/reject/process/retry) est parti avec le workflow
 * in-app, Léane rembourse depuis le dashboard Stripe et la synchro webhook
 * porte la conformité (avoir, email, statut).
 */
export function RefundDetailHeader({ refund }: RefundDetailHeaderProps) {
	// Titre lisible pour le header mobile (sinon : id opaque Title-Casé).
	useSetAdminPageTitle(`Remboursement ${formatEuro(refund.amount)}`);

	return (
		<DetailHeaderShell>
			<div className="min-w-0">
				<h1 className="font-display text-foreground flex flex-wrap items-center gap-2 text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl">
					<ReceiptIcon className="size-6 shrink-0 sm:size-7" aria-hidden="true" />
					Remboursement
					<span className="text-muted-foreground text-base sm:text-lg">
						· {formatEuro(refund.amount)}
					</span>
				</h1>
				<div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs md:hidden">
					<Badge
						variant={REFUND_STATUS_VARIANTS[refund.status]}
						className="shrink-0"
						style={{ viewTransitionName: `refund-status-${refund.id}` }}
					>
						{REFUND_STATUS_LABELS[refund.status]}
					</Badge>
					<span aria-hidden="true">·</span>
					<span className="truncate">
						{formatDistanceToNow(refund.createdAt, { addSuffix: true, locale: fr })}
					</span>
				</div>
				<p className="text-muted-foreground mt-1 hidden text-sm md:flex md:items-center md:gap-2">
					<Badge
						variant={REFUND_STATUS_VARIANTS[refund.status]}
						className="shrink-0"
						style={{ viewTransitionName: `refund-status-${refund.id}` }}
					>
						{REFUND_STATUS_LABELS[refund.status]}
					</Badge>
					<span aria-hidden="true">·</span>
					<span>Créé le {format(refund.createdAt, "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}</span>
					<span aria-hidden="true">·</span>
					<Link
						href={`/admin/ventes/commandes/${refund.order.id}`}
						className="text-primary inline-flex items-center gap-1 hover:underline"
					>
						{refund.order.orderNumber}
						<ArrowSquareOutIcon className="size-3" aria-hidden="true" />
					</Link>
				</p>
			</div>
		</DetailHeaderShell>
	);
}
