import { use } from "react";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";

import type { RetractationListItem } from "../../data/get-retractations";
import { retractationOrderLabel } from "../../utils/retractation-order-label";
import { RefundDeadlineBadge } from "./refund-deadline-badge";
import { RetractationStatusBadge } from "./retractation-status-badge";

/**
 * Liste des demandes de rétractation — file d'attente rare (quelques cas par
 * an), actives en tête, l'alerte du délai de remboursement bien visible.
 */
export function RetractationsList({
	retractationsPromise,
}: {
	retractationsPromise: Promise<RetractationListItem[]>;
}) {
	const retractations = use(retractationsPromise);

	if (retractations.length === 0) {
		return (
			<TableEmptyState
				icon={ArrowUUpLeftIcon}
				title="Aucune demande de rétractation"
				description="Les demandes envoyées depuis les pages de suivi de commande apparaîtront ici."
			/>
		);
	}

	return (
		<ItemGroup aria-label="Demandes de rétractation" className="gap-2">
			{retractations.map((retractation) => (
				<li key={retractation.id}>
					<Link
						href={`/admin/ventes/retractations/${retractation.id}`}
						className="bg-card focus-visible:ring-ring block rounded-xl border p-4 outline-none focus-visible:ring-2"
					>
						<div className="flex flex-wrap items-baseline justify-between gap-3">
							<span className="font-medium">
								Commande {retractationOrderLabel(retractation.order)}
							</span>
							<span className="text-sm font-medium">
								{formatEuro(retractation.order.amountTotalCents)}
							</span>
						</div>
						<p className="text-muted-foreground mt-1 truncate text-sm">
							{retractation.order.customerName ?? retractation.order.email} · demandée le{" "}
							{formatDateShort(retractation.requestedAt)}
						</p>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<RetractationStatusBadge status={retractation.status} />
							<RefundDeadlineBadge daysLeft={retractation.refundDeadlineDaysLeft} />
						</div>
					</Link>
				</li>
			))}
		</ItemGroup>
	);
}
