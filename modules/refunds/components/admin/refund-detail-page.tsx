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
import { DetailInfoList, DetailInfoRow } from "@/shared/components/admin/detail-info-row";

interface RefundDetailPageProps {
	refund: NonNullable<GetRefundReturn>;
}

export function RefundDetailPage({ refund }: RefundDetailPageProps) {
	return (
		<div className="space-y-4 md:space-y-6">
			<RefundDetailHeader refund={refund} />

			{/* Traitement mobile edge-to-edge aligné sur `order-detail-page` : `Card` est
			    déjà plat/sans bordure sous `md`, donc sans les marges négatives + les
			    `divide-y` on obtenait des cartes flottant dans 24 px de vide, sans
			    séparateur — deux grammaires visuelles pour trois pages sœurs. */}
			<div className="grid gap-0 md:gap-6 lg:grid-cols-3 lg:items-start">
				<div className="-mx-[var(--admin-main-x,1.5rem)] space-y-0 divide-y md:mx-0 md:space-y-6 md:divide-y-0 lg:col-span-2">
					<Card style={{ viewTransitionName: "refund-detail-info" }}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Info className="size-5" aria-hidden="true" />
								Informations
							</CardTitle>
						</CardHeader>
						<CardContent>
							<DetailInfoList>
								<DetailInfoRow label="Statut">
									<Badge variant={REFUND_STATUS_VARIANTS[refund.status]}>
										{REFUND_STATUS_LABELS[refund.status]}
									</Badge>
								</DetailInfoRow>
								<DetailInfoRow label="Montant" valueClassName="font-medium">
									{formatEuro(refund.amount)}
								</DetailInfoRow>
								<DetailInfoRow label="Motif" valueClassName="font-medium">
									{REFUND_REASON_LABELS[refund.reason]}
								</DetailInfoRow>
								<DetailInfoRow label="Créé le">{formatDateShort(refund.createdAt)}</DetailInfoRow>
								{refund.status === "FAILED" && refund.failureReason ? (
									// P2 (audit 2026-08-01) : la raison d'échec Stripe n'était affichée
									// nulle part — l'admin voyait un badge « Échoué » sans pouvoir
									// décider entre relance (erreur temporaire) et intervention.
									<DetailInfoRow
										label="Raison de l'échec"
										className="border-t pt-3"
										labelClassName="mb-1 block"
										valueClassName="text-destructive text-pretty whitespace-pre-wrap"
									>
										{refund.failureReason.replace(/^\[transient\]\s*/, "")}
										{refund.failureReason.startsWith("[transient]")
											? " — erreur temporaire, la relance a de bonnes chances d'aboutir."
											: ""}
									</DetailInfoRow>
								) : null}
								{refund.note ? (
									// Note libre : pas de mise en ligne (multiligne possible), séparée par un filet.
									<DetailInfoRow
										label="Note admin"
										className="border-t pt-3"
										labelClassName="mb-1 block"
										valueClassName="text-pretty whitespace-pre-wrap"
									>
										{refund.note}
									</DetailInfoRow>
								) : null}
							</DetailInfoList>
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
								<DetailInfoList>
									<DetailInfoRow
										label={<>Numéro d&apos;avoir</>}
										valueClassName="flex items-center gap-1"
									>
										<code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs tabular-nums">
											{refund.creditNoteNumber}
										</code>
										<CopyButton
											text={refund.creditNoteNumber}
											label="Numéro d'avoir"
											className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
										/>
									</DetailInfoRow>
									{refund.creditNoteGeneratedAt ? (
										<DetailInfoRow label="Émis le">
											{formatDateShort(refund.creditNoteGeneratedAt)}
										</DetailInfoRow>
									) : null}
								</DetailInfoList>
								<DownloadAdminCreditNoteButton
									orderNumber={refund.order.orderNumber}
									creditNoteNumber={refund.creditNoteNumber}
									refundId={refund.id}
								/>
							</CardContent>
						</Card>
					) : null}
				</div>

				<div className="-mx-[var(--admin-main-x,1.5rem)] space-y-0 divide-y md:mx-0 md:space-y-6 md:divide-y-0">
					<Card style={{ viewTransitionName: "refund-detail-customer" }}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Info className="size-5" aria-hidden="true" />
								Commande &amp; client
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<DetailInfoList>
								<DetailInfoRow
									label="N° commande"
									align="start"
									labelClassName="shrink-0 pt-1.5"
									valueClassName="flex min-w-0 items-start gap-1"
								>
									<span className="text-foreground/80 pt-1.5 font-mono text-xs break-all">
										{refund.order.orderNumber}
									</span>
									<CopyButton
										text={refund.order.orderNumber}
										label="N° commande"
										className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
									/>
								</DetailInfoRow>
								<DetailInfoRow label="Client" valueClassName="truncate text-right font-medium">
									{refund.order.customerName || refund.order.customerEmail}
								</DetailInfoRow>
								<DetailInfoRow
									label="Email"
									align="start"
									labelClassName="shrink-0 pt-1.5"
									valueClassName="flex min-w-0 items-start gap-1"
								>
									<span className="text-foreground/80 pt-1.5 text-xs break-all">
										{refund.order.customerEmail}
									</span>
									<CopyButton
										text={refund.order.customerEmail}
										label="Email"
										className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
									/>
								</DetailInfoRow>
							</DetailInfoList>
							<Button
								render={<Link href={`/admin/ventes/commandes/${refund.order.id}`} />}
								variant="outline"
								className="h-11 w-full justify-start gap-3"
							>
								<ExternalLink className="size-4" aria-hidden="true" />
								Voir la commande
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
