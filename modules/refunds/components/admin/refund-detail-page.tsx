import { ExternalLink, FileWarning, Info } from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/shared/components/copy-button";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { DownloadAdminCreditNoteButton } from "@/modules/orders/components/admin/order-detail/download-admin-credit-note-button";
import { formatDateShort } from "@/shared/utils/dates";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	REFUND_REASON_LABELS,
	REFUND_STATUS_LABELS,
	REFUND_STATUS_VARIANTS,
} from "../../constants/refund.constants";
import type { GetRefundReturn } from "../../types/refund.types";

import { RefundDetailHeader } from "./refund-detail-header";

interface RefundDetailPageProps {
	refund: NonNullable<GetRefundReturn>;
}

export function RefundDetailPage({ refund }: RefundDetailPageProps) {
	return (
		<div className="space-y-6">
			<RefundDetailHeader refund={refund} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<Card style={{ viewTransitionName: "refund-detail-info" }}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Info className="size-5" aria-hidden="true" />
								Informations
							</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="grid gap-3 text-sm">
								<div className="flex items-center justify-between gap-3">
									<dt className="text-muted-foreground">Statut</dt>
									<dd>
										<Badge variant={REFUND_STATUS_VARIANTS[refund.status]}>
											{REFUND_STATUS_LABELS[refund.status]}
										</Badge>
									</dd>
								</div>
								<div className="flex items-center justify-between gap-3">
									<dt className="text-muted-foreground">Montant</dt>
									<dd className="font-medium">{formatEuro(refund.amount)}</dd>
								</div>
								<div className="flex items-center justify-between gap-3">
									<dt className="text-muted-foreground">Motif</dt>
									<dd className="font-medium">{REFUND_REASON_LABELS[refund.reason]}</dd>
								</div>
								<div className="flex items-center justify-between gap-3">
									<dt className="text-muted-foreground">Créé le</dt>
									<dd>{formatDateShort(refund.createdAt)}</dd>
								</div>
								{refund.note ? (
									<div className="border-t pt-3">
										<dt className="text-muted-foreground mb-1">Note admin</dt>
										<dd className="text-pretty whitespace-pre-wrap">{refund.note}</dd>
									</div>
								) : null}
							</dl>
						</CardContent>
					</Card>

					{refund.creditNoteNumber ? (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileWarning className="text-warning size-5" aria-hidden="true" />
									Avoir comptable
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<dl className="grid gap-3 text-sm">
									<div className="flex items-center justify-between gap-3">
										<dt className="text-muted-foreground">Numéro d&apos;avoir</dt>
										<dd className="flex items-center gap-1">
											<code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs tabular-nums">
												{refund.creditNoteNumber}
											</code>
											<CopyButton
												text={refund.creditNoteNumber}
												label="Numéro d'avoir"
												className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
											/>
										</dd>
									</div>
									{refund.creditNoteGeneratedAt ? (
										<div className="flex items-center justify-between gap-3">
											<dt className="text-muted-foreground">Émis le</dt>
											<dd>{formatDateShort(refund.creditNoteGeneratedAt)}</dd>
										</div>
									) : null}
								</dl>
								<DownloadAdminCreditNoteButton
									orderNumber={refund.order.orderNumber}
									creditNoteNumber={refund.creditNoteNumber}
									refundId={refund.id}
								/>
							</CardContent>
						</Card>
					) : null}
				</div>

				<div className="space-y-6">
					<Card style={{ viewTransitionName: "refund-detail-customer" }}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Info className="size-5" aria-hidden="true" />
								Commande &amp; client
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<dl className="grid gap-3 text-sm">
								<div className="flex items-start justify-between gap-3">
									<dt className="text-muted-foreground shrink-0 pt-1.5">N° commande</dt>
									<dd className="flex min-w-0 items-start gap-1">
										<span className="text-foreground/80 pt-1.5 font-mono text-xs break-all">
											{refund.order.orderNumber}
										</span>
										<CopyButton
											text={refund.order.orderNumber}
											label="N° commande"
											className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
										/>
									</dd>
								</div>
								<div className="flex items-center justify-between gap-3">
									<dt className="text-muted-foreground">Client</dt>
									<dd className="truncate text-right font-medium">
										{refund.order.customerName || refund.order.customerEmail}
									</dd>
								</div>
								<div className="flex items-start justify-between gap-3">
									<dt className="text-muted-foreground shrink-0 pt-1.5">Email</dt>
									<dd className="flex min-w-0 items-start gap-1">
										<span className="text-foreground/80 pt-1.5 text-xs break-all">
											{refund.order.customerEmail}
										</span>
										<CopyButton
											text={refund.order.customerEmail}
											label="Email"
											className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
										/>
									</dd>
								</div>
							</dl>
							<Button asChild variant="outline" className="h-11 w-full justify-start gap-3">
								<Link href={`/admin/ventes/commandes/${refund.order.id}`}>
									<ExternalLink className="size-4" aria-hidden="true" />
									Voir la commande
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
