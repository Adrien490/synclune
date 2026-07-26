import { AlertTriangle, FileText, FileWarning, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { CopyButton } from "@/shared/components/copy-button";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { InvoiceStatusBadge } from "@/modules/orders/components/admin/invoice-status-badge";
import { DownloadAdminInvoiceButton } from "./download-admin-invoice-button";
import { DownloadAdminCreditNoteButton } from "./download-admin-credit-note-button";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import { DetailInfoList, DetailInfoRow } from "@/shared/components/admin/detail-info-row";

interface OrderInvoiceCardProps {
	order: GetOrderReturn;
}

function formatDateTime(date: Date | null | undefined): string | null {
	if (!date) return null;
	return format(date, "d MMMM yyyy 'à' HH'h'mm", { locale: fr });
}

/**
 * Vue consolidée Facture / Avoir / Archive PDF pour le détail commande admin.
 *
 * Affiche `invoiceNumber` (F-YYYY-NNNNN), `invoiceGeneratedAt`, `invoicePdfHash`
 * (4 derniers chars pour audit), `creditNoteNumber` (A-YYYY-NNNNN) et
 * `creditNoteGeneratedAt` quand la facture est VOIDED.
 *
 * Détecte l'anomalie : commande PAID sans `invoiceNumber` (`invoiceStatus`
 * PENDING ou NULL alors que `paymentStatus===PAID`) — affichée en Alert
 * destructive (cf. EINV-UI-005 filter `invoiceAnomaly`).
 *
 * EINV-UI-016 + EINV-UI-001 + EINV-UI-002 (audit UI admin facturation 2026-05-28).
 */
export function OrderInvoiceCard({ order }: OrderInvoiceCardProps) {
	const isPaid = order.paymentStatus === PaymentStatus.PAID;
	const hasInvoice = Boolean(order.invoiceNumber);
	const isAnomaly = isPaid && !hasInvoice;
	const isVoided = order.invoiceStatus === "VOIDED" && Boolean(order.creditNoteNumber);
	const hashSuffix = order.invoicePdfHash ? order.invoicePdfHash.slice(-8) : null;
	// EINV-UI-105 : facture émise mais archivage PDF / avoir escaladé en échec (DLQ).
	const isRetryDeferred = hasInvoice && order.invoiceRetryDeferred === true;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-2">
						<FileText className="size-5" aria-hidden="true" />
						Facture & avoir
					</span>
					{order.invoiceStatus && <InvoiceStatusBadge status={order.invoiceStatus} />}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{isAnomaly && (
					<Alert variant="destructive">
						<AlertTriangle className="size-4" aria-hidden="true" />
						<AlertTitle>Anomalie de facturation</AlertTitle>
						<AlertDescription>
							Commande payée mais aucune facture émise. Le webhook ou le cron retry sera relancé
							automatiquement (vérifier Sentry tag
							<code className="bg-destructive/10 mx-1 rounded px-1 py-0.5 text-xs">
								ensure-invoice-number
							</code>
							).
						</AlertDescription>
					</Alert>
				)}

				{isRetryDeferred && (
					<Alert variant="destructive">
						<AlertTriangle className="size-4" aria-hidden="true" />
						<AlertTitle>Archivage / avoir en échec</AlertTitle>
						<AlertDescription>
							La facture est émise mais l&apos;archivage PDF ou l&apos;avoir a échoué et a été
							escaladé ({order.invoiceReconcileAttempts} tentative
							{order.invoiceReconcileAttempts > 1 ? "s" : ""}). Le cron{" "}
							<code className="bg-destructive/10 mx-1 rounded px-1 py-0.5 text-xs">
								reconcile-invoices
							</code>
							réessaie automatiquement — voir le runbook facturation si persistant.
						</AlertDescription>
					</Alert>
				)}

				{!hasInvoice && !isAnomaly && (
					<p className="text-muted-foreground text-sm">
						Aucune facture n&apos;est encore émise pour cette commande. Elle sera générée
						automatiquement à la confirmation du paiement (Art. 289-I CGI).
					</p>
				)}

				{hasInvoice && order.invoiceNumber && (
					<div className="space-y-3">
						<DetailInfoList orientation="stacked">
							<DetailInfoRow label="Numéro de facture">
								<div className="mt-1 flex items-center gap-2">
									<code
										className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm tabular-nums"
										aria-label={`Numéro de facture ${order.invoiceNumber}`}
									>
										{order.invoiceNumber}
									</code>
									<CopyButton
										text={order.invoiceNumber}
										label="Numéro de facture"
										className="size-7 p-0"
										size="icon"
									/>
								</div>
							</DetailInfoRow>

							{order.invoiceGeneratedAt && (
								<DetailInfoRow label="Émise le" valueClassName="mt-1 text-sm">
									{formatDateTime(order.invoiceGeneratedAt)}
								</DetailInfoRow>
							)}

							{hashSuffix && (
								<DetailInfoRow
									label="Empreinte SHA-256 (PDF immuable)"
									valueClassName="mt-1 flex items-center gap-2 font-mono text-xs tabular-nums"
								>
									<span
										title="Art. L102 B LPF — archive immuable"
										className="flex items-center gap-2"
									>
										<ShieldCheck className="text-success size-3.5" aria-hidden="true" />…
										{hashSuffix}
									</span>
								</DetailInfoRow>
							)}
						</DetailInfoList>

						<DownloadAdminInvoiceButton
							orderNumber={order.orderNumber}
							invoiceNumber={order.invoiceNumber}
						/>
					</div>
				)}

				{isVoided && order.creditNoteNumber && (
					<div className="border-warning/40 bg-warning/5 space-y-3 rounded-md border p-3">
						<div className="flex items-center gap-2">
							<FileWarning className="text-warning size-4" aria-hidden="true" />
							<p className="text-foreground text-sm font-medium">
								Avoir comptable émis (Art. 272-I CGI)
							</p>
						</div>
						<DetailInfoList orientation="stacked">
							<DetailInfoRow label="Numéro d'avoir" labelClassName="text-xs">
								<div className="mt-1 flex items-center gap-2">
									<code
										className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm tabular-nums"
										aria-label={`Numéro d'avoir ${order.creditNoteNumber}`}
									>
										{order.creditNoteNumber}
									</code>
									<CopyButton
										text={order.creditNoteNumber}
										label="Numéro d'avoir"
										className="size-7 p-0"
										size="icon"
									/>
								</div>
							</DetailInfoRow>
							{order.creditNoteGeneratedAt && (
								<DetailInfoRow
									label="Émis le"
									labelClassName="text-xs"
									valueClassName="mt-1 text-sm"
								>
									{formatDateTime(order.creditNoteGeneratedAt)}
								</DetailInfoRow>
							)}
							{order.invoiceVoidedAt && (
								<DetailInfoRow
									label="Facture annulée le"
									labelClassName="text-xs"
									valueClassName="mt-1 text-sm"
								>
									{formatDateTime(order.invoiceVoidedAt)}
								</DetailInfoRow>
							)}
						</DetailInfoList>
						<DownloadAdminCreditNoteButton
							orderNumber={order.orderNumber}
							creditNoteNumber={order.creditNoteNumber}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
