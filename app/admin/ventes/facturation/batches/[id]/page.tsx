import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { PageHeader } from "@/shared/components/page-header";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { formatEuro } from "@/shared/utils/format-euro";
import {
	getEReportingBatchById,
	RETRYABLE_BATCH_STATUSES,
} from "@/modules/invoices/data/get-ereporting-batch-by-id";
import { RetryEReportingBatchButton } from "@/modules/invoices/components/admin/retry-ereporting-batch-button";
import { INVOICE_FEATURE_FLAGS } from "@/modules/invoices/constants/feature-flags";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
	title: "Détail batch e-reporting — Administration",
	description: "Payload XML, réponse PDP, retry transmission DGFiP",
};

type BatchDetailPageParams = Promise<{ id: string }>;

function formatDate(date: Date | null | undefined): string | null {
	if (!date) return null;
	return format(date, "d MMM yyyy 'à' HH'h'mm", { locale: fr });
}

export default async function BatchDetailPage({ params }: { params: BatchDetailPageParams }) {
	const { id } = await params;
	const batch = await getEReportingBatchById(id);

	if (!batch) {
		notFound();
	}

	const isRetryable = RETRYABLE_BATCH_STATUSES.has(batch.status);
	const ereportingEnabled = INVOICE_FEATURE_FLAGS.enable_ereporting;
	const providerResponseText = batch.providerResponse
		? JSON.stringify(batch.providerResponse, null, 2)
		: null;

	return (
		<div className="space-y-6">
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/ventes">Ventes</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/ventes/facturation">Facturation</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Batch {batch.id.slice(0, 8)}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				variant="compact"
				title={`Batch e-reporting ${batch.id.slice(0, 8)}`}
				description={`Période ${format(batch.periodFrom, "d MMM yyyy", { locale: fr })} → ${format(batch.periodTo, "d MMM yyyy", { locale: fr })}`}
			/>

			<div className="flex flex-wrap items-center gap-2">
				<Badge
					variant={
						batch.status === "REJECTED" || batch.status === "ABANDONED"
							? "destructive"
							: batch.status === "ACCEPTED"
								? "success"
								: "secondary"
					}
					className="text-sm"
				>
					{batch.status}
				</Badge>
				<span className="text-muted-foreground text-sm">Retry count : {batch.retryCount}</span>
				{isRetryable && (
					<div className="ml-auto">
						<RetryEReportingBatchButton
							batchId={batch.id}
							disabled={!ereportingEnabled}
							disabledReason={
								!ereportingEnabled
									? "INVOICE_ENABLE_EREPORTING=false — flag d'environnement désactivé"
									: undefined
							}
						/>
					</div>
				)}
			</div>

			{batch.rejectionReason && (
				<Alert variant="destructive">
					<AlertTriangle className="size-4" aria-hidden="true" />
					<AlertTitle>Motif de rejet DGFiP</AlertTitle>
					<AlertDescription>
						<pre className="bg-destructive/5 mt-2 rounded p-2 font-mono text-xs whitespace-pre-wrap">
							{batch.rejectionReason}
						</pre>
					</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Transactions</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-display text-2xl font-normal">{batch.transactionCount}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Montant TTC</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-display text-2xl font-normal">
							{formatEuro(batch.totalAmountIncTax)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Montant HT</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-display text-2xl font-normal">
							{formatEuro(batch.totalAmountExclTax)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">TVA</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-display text-2xl font-normal">
							{formatEuro(batch.totalTaxAmount)}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base font-medium">Transmission</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<MetaRow label="Provider Batch ID" value={batch.providerBatchId ?? "—"} mono />
					<MetaRow label="Créé le" value={formatDate(batch.createdAt) ?? "—"} />
					<MetaRow label="Mis à jour" value={formatDate(batch.updatedAt) ?? "—"} />
					<MetaRow label="Envoyé" value={formatDate(batch.sentAt) ?? "—"} />
					<MetaRow label="Accepté" value={formatDate(batch.acceptedAt) ?? "—"} />
					<MetaRow label="Rejeté" value={formatDate(batch.rejectedAt) ?? "—"} />
				</CardContent>
			</Card>

			{providerResponseText && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base font-medium">Réponse provider (JSON)</CardTitle>
					</CardHeader>
					<CardContent>
						<pre className="bg-muted max-h-96 overflow-auto rounded p-3 font-mono text-xs">
							{providerResponseText}
						</pre>
					</CardContent>
				</Card>
			)}

			<section className="space-y-4">
				<h2 className="text-foreground text-lg font-medium">
					Transactions du batch ({batch.transactions.length})
				</h2>
				{batch.transactions.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Aucune transaction liée à ce batch (peut indiquer que les transactions ont été purgées
						ou que l&apos;agrégation n&apos;a pas encore eu lieu).
					</p>
				) : (
					<div className="border-border rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Commande</TableHead>
									<TableHead>Facture</TableHead>
									<TableHead className="text-right">Montant TTC</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{batch.transactions.map((tx) => (
									<TableRow key={tx.id}>
										<TableCell>
											<Badge variant={tx.type === "SALES" ? "default" : "warning"}>{tx.type}</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{format(tx.occurredAt, "d MMM yyyy", { locale: fr })}
										</TableCell>
										<TableCell>
											{tx.orderId && tx.order ? (
												<Link
													href={`/admin/ventes/commandes/${tx.orderId}`}
													className="text-sm tabular-nums underline"
												>
													{tx.order.orderNumber}
												</Link>
											) : (
												<span className="text-muted-foreground text-sm">—</span>
											)}
										</TableCell>
										<TableCell className="font-mono text-xs tabular-nums">
											{tx.order?.invoiceNumber ?? "—"}
										</TableCell>
										<TableCell className="text-right text-sm font-medium">
											{formatEuro(tx.amountIncTax)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</section>
		</div>
	);
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
	return (
		<div className="grid grid-cols-2 gap-3">
			<span className="text-muted-foreground">{label}</span>
			<span className={mono ? "font-mono text-xs tabular-nums" : ""}>{value}</span>
		</div>
	);
}
