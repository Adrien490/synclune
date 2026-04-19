import { use } from "react";
import { Ticket } from "lucide-react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { StopEventPropagation } from "@/shared/components/stop-event-propagation";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import { formatEuro } from "@/shared/utils/format-euro";
import { DiscountType } from "@/app/generated/prisma/client";
import type { GetDiscountsReturn } from "@/modules/discounts/data/get-discounts";
import {
	DISCOUNT_TYPE_LABELS,
	DISCOUNT_TYPE_ICONS,
} from "@/modules/discounts/constants/discount.constants";
import {
	getDiscountStatus,
	type DiscountStatus,
} from "@/modules/discounts/services/discount-validation.service";
import { DiscountRowActions } from "./discount-row-actions";
import { CreateDiscountButton } from "./create-discount-button";

interface DiscountsMobileListProps {
	discountsPromise: Promise<GetDiscountsReturn>;
	perPage: number;
}

const STATUS_BADGE_CONFIG: Record<
	DiscountStatus,
	{ label: string; variant: "default" | "secondary" | "outline" | "success" }
> = {
	active: { label: "Actif", variant: "success" },
	inactive: { label: "Inactif", variant: "secondary" },
	scheduled: { label: "Planifié", variant: "outline" },
	expired: { label: "Expiré", variant: "secondary" },
	exhausted: { label: "Épuisé", variant: "secondary" },
};

const formatValue = (type: DiscountType, value: number) => {
	if (type === DiscountType.PERCENTAGE) {
		return `${value}%`;
	}
	return formatEuro(value);
};

const formatUsage = (usageCount: number, maxUsageCount: number | null) => {
	if (maxUsageCount === null) {
		return `${usageCount} / ∞`;
	}
	return `${usageCount} / ${maxUsageCount}`;
};

export function DiscountsMobileList({ discountsPromise, perPage }: DiscountsMobileListProps) {
	const { discounts, pagination } = use(discountsPromise);

	if (discounts.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Ticket}
					title="Aucun code promo trouvé"
					description="Aucun code promo ne correspond aux critères de recherche."
					actionElement={<CreateDiscountButton />}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<ItemGroup aria-label="Codes promo" className="gap-2">
				{discounts.map((discount) => {
					const status = STATUS_BADGE_CONFIG[getDiscountStatus(discount)];
					return (
						<div key={discount.id} role="listitem">
							<Item
								variant="outline"
								size="sm"
								className="gap-3"
								aria-roledescription="carte code promo"
								aria-label={`Code promo ${discount.code}`}
							>
								<ItemContent className="min-w-0">
									<ItemTitle>
										<code className="bg-muted truncate rounded px-1.5 py-0.5 text-sm font-semibold">
											{discount.code}
										</code>
										<Badge variant={status.variant}>{status.label}</Badge>
									</ItemTitle>
									<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
										<span>
											{DISCOUNT_TYPE_ICONS[discount.type]} {DISCOUNT_TYPE_LABELS[discount.type]}
										</span>
										<span aria-hidden="true">·</span>
										<span className="font-medium">
											{formatValue(discount.type, discount.value)}
										</span>
										<span aria-hidden="true">·</span>
										<span>{formatUsage(discount.usageCount, discount.maxUsageCount)}</span>
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<StopEventPropagation>
										<DiscountRowActions discount={discount} />
									</StopEventPropagation>
								</ItemActions>
							</Item>
						</div>
					);
				})}
			</ItemGroup>

			<CursorPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={discounts.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
			/>
		</div>
	);
}
