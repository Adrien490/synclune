import Link from "next/link";
import { FileTextIcon } from "@phosphor-icons/react/ssr";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { TableEmptyState } from "@/shared/components/data-table";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { formatEuro } from "@/shared/utils/format-euro";
import { InvoiceStatusBadge } from "@/modules/orders/components/admin/invoice-status-badge";
import type { InvoiceSummary } from "@/modules/invoices/data/get-invoicing-overview";

interface InvoicesListTableProps {
	invoices: ReadonlyArray<InvoiceSummary>;
}

/**
 * Liste des 10 dernières factures émises (Art. 286 CGI — séquence gap-free
 * F-YYYY-NNNNN). Chaque ligne pointe vers le détail commande. La recherche
 * par numéro de facture est accessible via la barre de recherche sur
 * `/admin/ventes/commandes` (search via `buildOrderSearchConditions`).
 *
 * EINV-UI-012 audit 2026-05-28.
 */
export function InvoicesListTable({ invoices }: InvoicesListTableProps) {
	if (invoices.length === 0) {
		return (
			<TableEmptyState
				icon={FileTextIcon}
				title="Aucune facture émise"
				description="Les factures sont générées automatiquement à l'encaissement (Art. 289-I CGI)."
			/>
		);
	}

	// Encart de synthèse (10 dernières factures), pas une liste admin paginée :
	// pas de toolbar ni de pagination curseur. Il partage en revanche le
	// `TableScrollContainer` des 11 listes — sans lui, les 6 colonnes débordaient
	// horizontalement sans indicateur de scroll sur mobile.
	return (
		<div className="border-border rounded-md border">
			<TableScrollContainer label="Dernières factures émises">
				<Table noRegion>
					<TableHeader>
						<TableRow>
							<TableHead>N° facture</TableHead>
							<TableHead>Date émission</TableHead>
							<TableHead>Commande</TableHead>
							<TableHead>Client</TableHead>
							<TableHead>Statut</TableHead>
							<TableHead className="text-right">Montant TTC</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{invoices.map((invoice) => (
							<TableRow key={invoice.id}>
								<TableCell className="font-mono text-xs tabular-nums">
									{invoice.invoiceNumber}
									{invoice.creditNoteNumber && (
										<span className="text-muted-foreground mt-0.5 block text-[10px]">
											avoir {invoice.creditNoteNumber}
										</span>
									)}
								</TableCell>
								<TableCell className="text-muted-foreground text-xs">
									{format(invoice.invoiceGeneratedAt, "d MMM yyyy", { locale: fr })}
								</TableCell>
								<TableCell>
									<Link
										href={`/admin/ventes/commandes/${invoice.orderId}`}
										className="text-foreground text-sm tabular-nums underline"
										aria-label={`Voir commande ${invoice.orderNumber}`}
									>
										{invoice.orderNumber}
									</Link>
								</TableCell>
								<TableCell className="text-sm">{invoice.customerName ?? "—"}</TableCell>
								<TableCell>
									<InvoiceStatusBadge status={invoice.invoiceStatus} />
								</TableCell>
								<TableCell className="text-right text-sm font-medium">
									{formatEuro(invoice.total)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableScrollContainer>
		</div>
	);
}
