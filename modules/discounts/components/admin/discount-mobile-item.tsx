"use client";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { formatEuro } from "@/shared/utils/format-euro";

import { DiscountType } from "@/app/generated/prisma/enums";
import {
	DISCOUNT_TYPE_ICONS,
	DISCOUNT_TYPE_LABELS,
} from "@/modules/discounts/constants/discount.constants";
import { useDiscountActions } from "@/modules/discounts/hooks/use-discount-actions";
import {
	getDiscountStatus,
	type DiscountStatus,
} from "@/modules/discounts/services/discount-validation.service";
import type { Discount } from "@/modules/discounts/types/discount.types";

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
	if (type === DiscountType.PERCENTAGE) return `${value}%`;
	return formatEuro(value);
};

const formatUsage = (usageCount: number, maxUsageCount: number | null) => {
	if (maxUsageCount === null) return `${usageCount} / ∞`;
	return `${usageCount} / ${maxUsageCount}`;
};

interface DiscountMobileItemProps {
	discount: Discount;
}

export function DiscountMobileItem({ discount }: DiscountMobileItemProps) {
	const status = STATUS_BADGE_CONFIG[getDiscountStatus(discount)];
	const { sections } = useDiscountActions({ discount });

	return (
		<MobileSelectableCard
			id={discount.id}
			itemLabel={`Code promo ${discount.code}`}
			longPressProps={{
				href: `/admin/marketing/discounts/${discount.id}/modifier`,
				ariaLabel: `Code promo ${discount.code}`,
				sections,
				menuTitle: "Actions",
				menuDescription: discount.code,
				className: "text-left",
			}}
		>
			<Item variant="outline" size="sm" className="gap-3" aria-roledescription="carte code promo">
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
						<span className="font-medium">{formatValue(discount.type, discount.value)}</span>
						<span aria-hidden="true">·</span>
						<span>{formatUsage(discount.usageCount, discount.maxUsageCount)}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</MobileSelectableCard>
	);
}
