import {
	AdminDataTable,
	BulkSelectionHeaderCheckbox,
	BulkSelectionRowCheckbox,
	TableEmptyState,
} from "@/shared/components/data-table";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import type { GetDiscountsReturn } from "@/modules/discounts/data/get-discounts";
import {
	DISCOUNT_STATUS_BADGE_CONFIG,
	DISCOUNT_TYPE_LABELS,
	formatDiscountUsage,
	formatDiscountValue,
} from "@/modules/discounts/constants/discount.constants";
import type { DiscountStatus } from "@/modules/discounts/types/discount.types";
import {
	CalendarClock,
	CheckCircle,
	CircleOff,
	TicketX,
	Timer,
	Ticket,
	type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { DiscountRowActions } from "./discount-row-actions";
import { DiscountsBulkActionsBar } from "./discounts-bulk-actions-bar";
import { CreateDiscountButton } from "./create-discount-button";
import { getDiscountStatus } from "@/modules/discounts/services/discount-validation.service";

const DISCOUNT_STATUS_ICONS: Record<DiscountStatus, LucideIcon> = {
	active: CheckCircle,
	inactive: CircleOff,
	scheduled: CalendarClock,
	expired: Timer,
	exhausted: TicketX,
};

interface DiscountsDataTableProps {
	discountsPromise: Promise<GetDiscountsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export async function DiscountsDataTable({
	discountsPromise,
	perPage,
	hasActiveFilters,
}: DiscountsDataTableProps) {
	const { discounts, pagination } = await discountsPromise;

	if (discounts.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={Ticket}
				title="Aucun code promo trouvé"
				description="Aucun code promo ne correspond aux critères de recherche."
				noItemsDescription="Aucun code promo pour l'instant."
				hasActiveFilters={hasActiveFilters}
				resetFiltersHref="/admin/marketing/discounts"
				actionElement={<CreateDiscountButton />}
			/>
		);
	}

	const pageItemIds = discounts.map((d) => d.id);

	return (
		<AdminDataTable
			caption="Liste des codes promo"
			pageItemIds={pageItemIds}
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: discounts.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
			}}
			bulkActionsBar={<DiscountsBulkActionsBar />}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[4%]">
						<BulkSelectionHeaderCheckbox itemsLabel="codes promo" />
						<span className="sr-only">Sélection</span>
					</TableHead>
					<TableHead className="w-[16%]">Code</TableHead>
					<TableHead className="w-[14%]">Type</TableHead>
					<TableHead className="w-[12%]">Valeur</TableHead>
					<TableHead className="w-[14%] text-center">Utilisations</TableHead>
					<TableHead className="w-[10%] text-center">Statut</TableHead>
					<TableHead
						className="w-[8%] text-right"
						aria-label="Actions disponibles pour chaque code promo"
					>
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{discounts.map((discount) => (
					<TableRow key={discount.id}>
						<TableCell>
							<BulkSelectionRowCheckbox id={discount.id} itemLabel={`Code ${discount.code}`} />
						</TableCell>
						<TableCell>
							<Link
								href={`/admin/marketing/discounts/${discount.id}`}
								className="focus-visible:ring-ring inline-block rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
								aria-label={`Voir le détail du code promo ${discount.code}`}
							>
								<code
									className="bg-muted hover:bg-muted/70 rounded px-2 py-1 text-sm font-semibold transition-colors"
									style={{ viewTransitionName: `discount-code-${discount.id}` }}
								>
									{discount.code}
								</code>
							</Link>
						</TableCell>
						<TableCell>
							<span className="text-muted-foreground text-sm">
								{DISCOUNT_TYPE_LABELS[discount.type]}
							</span>
						</TableCell>
						<TableCell>
							<span className="text-sm font-medium">
								{formatDiscountValue(discount.type, discount.value)}
							</span>
						</TableCell>
						<TableCell className="text-center">
							<span className="text-sm">
								{formatDiscountUsage(discount.usageCount, discount.maxUsageCount)}
							</span>
						</TableCell>
						<TableCell className="text-center">
							{(() => {
								const statusKey = getDiscountStatus(discount);
								const { label, variant } = DISCOUNT_STATUS_BADGE_CONFIG[statusKey];
								const Icon = DISCOUNT_STATUS_ICONS[statusKey];
								return (
									<Badge
										variant={variant}
										role="status"
										aria-label={`Statut : ${label}`}
										style={{ viewTransitionName: `discount-status-${discount.id}` }}
									>
										<Icon aria-hidden="true" />
										{label}
									</Badge>
								);
							})()}
						</TableCell>
						<TableCell>
							<div className="flex justify-end">
								<DiscountRowActions discount={discount} />
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</AdminDataTable>
	);
}
