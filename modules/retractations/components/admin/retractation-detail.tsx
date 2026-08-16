import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateTime } from "@/shared/utils/dates";

import type { RetractationDetail as RetractationDetailData } from "../../data/get-retractation";
import { retractationOrderLabel } from "../../utils/retractation-order-label";
import { RefundDeadlineBadge } from "./refund-deadline-badge";
import { RetractationDetailActions } from "./retractation-detail-actions";
import { RetractationStatusBadge } from "./retractation-status-badge";

/** Détail d'une demande — commande liée en snapshots, chronologie, actions. */
export function RetractationDetail({ retractation }: { retractation: RetractationDetailData }) {
	const { order } = retractation;
	const orderLabel = retractationOrderLabel(order);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-2">
					<RetractationStatusBadge status={retractation.status} />
					<RefundDeadlineBadge daysLeft={retractation.refundDeadlineDaysLeft} />
				</div>
				<RetractationDetailActions
					retractationId={retractation.id}
					orderLabel={orderLabel}
					amountTotalCents={order.amountTotalCents}
					status={retractation.status}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Demande</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<dl className="space-y-2">
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Demandée le</dt>
								<dd>{formatDateTime(retractation.requestedAt)}</dd>
							</div>
							{retractation.acknowledgedAt && (
								<div className="flex justify-between gap-4">
									<dt className="text-muted-foreground">Accusé envoyé le</dt>
									<dd>{formatDateTime(retractation.acknowledgedAt)}</dd>
								</div>
							)}
							{retractation.itemReceivedAt && (
								<div className="flex justify-between gap-4">
									<dt className="text-muted-foreground">Colis reçu le</dt>
									<dd>{formatDateTime(retractation.itemReceivedAt)}</dd>
								</div>
							)}
							{retractation.refundedAt && (
								<div className="flex justify-between gap-4">
									<dt className="text-muted-foreground">Remboursée le</dt>
									<dd>{formatDateTime(retractation.refundedAt)}</dd>
								</div>
							)}
							{retractation.creditNoteNumber != null && (
								<div className="flex justify-between gap-4">
									<dt className="text-muted-foreground">Avoir</dt>
									<dd>
										<Link
											href={`/suivi-commande/avoir?commande=${order.id}`}
											target="_blank"
											className="hover:text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-md underline outline-none focus-visible:ring-2"
										>
											n° {retractation.creditNoteNumber}
											<ArrowSquareOutIcon aria-hidden="true" className="size-4" />
										</Link>
									</dd>
								</div>
							)}
						</dl>

						<Separator className="my-3" />

						<p className="text-muted-foreground">Motif de la cliente :</p>
						<p>{retractation.reason ?? "— aucun motif fourni (elle n'a pas à se justifier)."}</p>

						{retractation.status === "RECEIVED" && (
							<p className="text-destructive text-xs">
								⚠️ L&apos;accusé de réception n&apos;est pas parti (échec d&apos;envoi) — la cliente
								n&apos;a pas eu la marche à suivre. Réponds-lui directement par email.
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Commande {orderLabel}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<p className="text-muted-foreground break-all">
							{order.customerName ? `${order.customerName} · ` : ""}
							{order.email}
						</p>
						<ul className="divide-border divide-y">
							{order.items.map((item) => (
								<li key={item.id} className="flex items-start justify-between gap-4 py-2">
									<span className="min-w-0">
										{item.nameSnapshot}
										{item.variantSnapshot && (
											<span className="text-muted-foreground"> — {item.variantSnapshot}</span>
										)}{" "}
										× {item.quantity}
									</span>
									<span className="font-medium">
										{formatEuro(item.unitPriceCents * item.quantity)}
									</span>
								</li>
							))}
						</ul>
						<Separator className="my-2" />
						<div className="flex justify-between">
							<span className="text-muted-foreground">Total encaissé (à rembourser)</span>
							<span className="font-medium">{formatEuro(order.amountTotalCents)}</span>
						</div>
						<Link
							href={`/admin/ventes/commandes/${order.id}`}
							className="hover:text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-md text-sm underline outline-none focus-visible:ring-2"
						>
							Voir la commande complète
						</Link>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
