"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Ellipsis, ExternalLink, Receipt } from "lucide-react";
import Link from "next/link";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";

import { REFUND_STATUS_LABELS, REFUND_STATUS_VARIANTS } from "../../constants/refund.constants";
import { useRefundActions } from "../../hooks/use-refund-actions";
import type { GetRefundReturn } from "../../types/refund.types";
import { useSetAdminPageTitle } from "@/app/admin/_components/admin-page-title-context";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface RefundDetailHeaderProps {
	refund: NonNullable<GetRefundReturn>;
}

export function RefundDetailHeader({ refund }: RefundDetailHeaderProps) {
	// Titre lisible pour le header mobile (sinon : id opaque Title-Casé).
	useSetAdminPageTitle(`Remboursement ${formatEuro(refund.amount)}`);
	const { sections } = useRefundActions({
		refund: {
			id: refund.id,
			status: refund.status,
			amount: refund.amount,
			orderId: refund.order.id,
			orderNumber: refund.order.orderNumber,
		},
	});

	return (
		<DetailHeaderShell>
			<div className="min-w-0">
				<h1 className="font-display text-foreground flex flex-wrap items-center gap-2 text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl">
					<Receipt className="size-6 shrink-0 sm:size-7" aria-hidden="true" />
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
						<ExternalLink className="size-3" aria-hidden="true" />
					</Link>
				</p>
			</div>

			<DetailStickyActionBar>
				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							aria-label="Plus d'actions"
							className="min-h-11 w-full touch-manipulation sm:min-h-9 md:w-auto"
						>
							<Ellipsis className="size-4" aria-hidden="true" />
							<span className="md:hidden">Actions</span>
						</Button>
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions remboursement"
						description={refund.order.orderNumber}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</DetailStickyActionBar>
		</DetailHeaderShell>
	);
}
