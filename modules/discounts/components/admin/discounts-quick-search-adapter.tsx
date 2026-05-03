"use client";

import { Tag } from "lucide-react";

import { DiscountType } from "@/app/generated/prisma/enums";
import { Badge } from "@/shared/components/ui/badge";
import type { AdminQuickSearchAdapter } from "@/shared/components/sticky-action-bar";
import { formatEuro } from "@/shared/utils/format-euro";

import { quickSearchDiscountsAdminAction } from "../../actions/quick-search-discounts-admin";
import type { AdminQuickSearchDiscountItem } from "../../data/quick-search-discounts-admin";

export const discountsAdminQuickSearchAdapter: AdminQuickSearchAdapter<AdminQuickSearchDiscountItem> =
	{
		scope: "discounts",
		placeholder: "Code promo…",
		ariaLabel: "Rechercher un code promo",
		minQueryLength: 2,
		search: (query) => quickSearchDiscountsAdminAction(query),
		getResultId: (d) => `admin-discount-${d.id}`,
		getResultHref: (d) => `/admin/marketing/discounts?search=${encodeURIComponent(d.code)}`,
		getResultLabel: (d) => d.code,
		renderResultItem: (d) => <DiscountCard discount={d} />,
	};

function DiscountCard({ discount }: { discount: AdminQuickSearchDiscountItem }) {
	const valueLabel =
		discount.type === DiscountType.PERCENTAGE ? `${discount.value}%` : formatEuro(discount.value);

	return (
		<>
			<div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
				<Tag className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{discount.code}</p>
				<div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
					<span className="shrink-0">{valueLabel}</span>
					<span aria-hidden="true">·</span>
					<span className="shrink-0">{discount.usageCount} utilisations</span>
				</div>
			</div>
			<Badge variant={discount.isActive ? "success" : "secondary"} className="text-[10px]">
				{discount.isActive ? "Actif" : "Inactif"}
			</Badge>
		</>
	);
}
