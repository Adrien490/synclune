"use client";

import { DiscountType } from "@/app/generated/prisma/enums";

import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	DISCOUNT_TYPE_ICONS,
	DISCOUNT_TYPE_LABELS,
} from "@/modules/discounts/constants/discount.constants";
import {
	getDiscountStatus,
	type DiscountStatus,
} from "@/modules/discounts/services/discount-validation.service";
import type { Discount } from "@/modules/discounts/types/discount.types";

import { DISCOUNT_ITEM_DRAWER_ID, type DiscountItemDrawerData } from "./discount-item-drawer";

interface DiscountMobileItemProps {
	discount: Discount;
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

const formatValue = (type: DiscountType, value: number) =>
	type === DiscountType.PERCENTAGE ? `${value}%` : formatEuro(value);

const formatUsage = (usageCount: number, maxUsageCount: number | null) =>
	maxUsageCount === null ? `${usageCount} / ∞` : `${usageCount} / ${maxUsageCount}`;

export function DiscountMobileItem({ discount }: DiscountMobileItemProps) {
	const { open } = useDialog<DiscountItemDrawerData>(DISCOUNT_ITEM_DRAWER_ID);
	const status = STATUS_BADGE_CONFIG[getDiscountStatus(discount)];

	return (
		<button
			type="button"
			onClick={() => open({ discount })}
			className="focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md text-left outline-none focus-visible:ring-[3px]"
			aria-label={`Ouvrir la fiche du code ${discount.code}`}
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte code promo"
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
						<span className="font-medium">{formatValue(discount.type, discount.value)}</span>
						<span aria-hidden="true">·</span>
						<span>{formatUsage(discount.usageCount, discount.maxUsageCount)}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</button>
	);
}
