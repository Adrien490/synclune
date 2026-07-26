"use client";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";

import {
	DISCOUNT_STATUS_BADGE_CONFIG,
	DISCOUNT_TYPE_ICONS,
	DISCOUNT_TYPE_LABELS,
	formatDiscountUsage,
	formatDiscountValue,
} from "@/modules/discounts/constants/discount.constants";
import { useDiscountActions } from "@/modules/discounts/hooks/use-discount-actions";
import { getDiscountStatus } from "@/modules/discounts/services/discount-validation.service";
import type { Discount } from "@/modules/discounts/types/discount.types";

interface DiscountMobileItemProps {
	discount: Discount;
}

export function DiscountMobileItem({ discount }: DiscountMobileItemProps) {
	const status = DISCOUNT_STATUS_BADGE_CONFIG[getDiscountStatus(discount)];
	const { sections } = useDiscountActions({ discount });

	return (
		<LongPressMenuLink
			href={`/admin/marketing/discounts/${discount.id}`}
			ariaLabel={`Code promo ${discount.code}`}
			sections={sections}
			menuTitle="Actions"
			menuDescription={discount.code}
			className="text-left"
			viewTransitionName={`discount-card-${discount.id}`}
		>
			<Item
				variant="outline"
				size="sm"
				className={"gap-3 motion-safe:transition-opacity"}
				aria-roledescription="carte code promo"
			>
				<ItemContent className="min-w-0">
					<ItemTitle>
						<code
							className="bg-muted truncate rounded px-1.5 py-0.5 text-sm font-semibold"
							style={{ viewTransitionName: `discount-code-${discount.id}` }}
						>
							{discount.code}
						</code>
						<Badge
							variant={status.variant}
							style={{ viewTransitionName: `discount-status-${discount.id}` }}
						>
							{status.label}
						</Badge>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>
							{DISCOUNT_TYPE_ICONS[discount.type]} {DISCOUNT_TYPE_LABELS[discount.type]}
						</span>
						<span aria-hidden="true">·</span>
						<span className="font-medium">
							{formatDiscountValue(discount.type, discount.value)}
						</span>
						<span aria-hidden="true">·</span>
						<span>{formatDiscountUsage(discount.usageCount, discount.maxUsageCount)}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</LongPressMenuLink>
	);
}
