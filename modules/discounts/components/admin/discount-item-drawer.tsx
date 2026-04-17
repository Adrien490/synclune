"use client";

import { Copy, Eye, Pencil, Power, PowerOff, Trash2 } from "lucide-react";

import { DiscountType } from "@/app/generated/prisma/enums";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	DISCOUNT_TYPE_ICONS,
	DISCOUNT_TYPE_LABELS,
} from "@/modules/discounts/constants/discount.constants";
import { useDuplicateDiscount } from "@/modules/discounts/hooks/use-duplicate-discount";
import {
	getDiscountStatus,
	type DiscountStatus,
} from "@/modules/discounts/services/discount-validation.service";
import type { Discount } from "@/modules/discounts/types/discount.types";

import { DISCOUNT_DIALOG_ID } from "./discount-form-dialog";
import { DISCOUNT_USAGES_DIALOG_ID } from "./discount-usages-dialog";
import { DELETE_DISCOUNT_DIALOG_ID } from "./delete-discount-alert-dialog";
import { TOGGLE_DISCOUNT_STATUS_DIALOG_ID } from "./toggle-discount-status-alert-dialog";

export const DISCOUNT_ITEM_DRAWER_ID = "discount-item-drawer";

export interface DiscountItemDrawerData {
	discount: Discount;
	[key: string]: unknown;
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

export function DiscountItemDrawer() {
	const drawer = useDialog<DiscountItemDrawerData>(DISCOUNT_ITEM_DRAWER_ID);
	const formDialog = useDialog(DISCOUNT_DIALOG_ID);
	const usagesDialog = useDialog(DISCOUNT_USAGES_DIALOG_ID);
	const deleteAlert = useAlertDialog(DELETE_DISCOUNT_DIALOG_ID);
	const toggleAlert = useAlertDialog(TOGGLE_DISCOUNT_STATUS_DIALOG_ID);
	const { duplicate, isPending: isDuplicating } = useDuplicateDiscount();

	const discount = drawer.data?.discount;

	if (!discount) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const status = STATUS_BADGE_CONFIG[getDiscountStatus(discount)];
	const canDelete = discount.usageCount === 0;

	const handleEdit = () => {
		drawer.close();
		formDialog.open({
			discount: {
				id: discount.id,
				code: discount.code,
				type: discount.type,
				value: discount.value,
				minOrderAmount: discount.minOrderAmount,
				maxUsageCount: discount.maxUsageCount,
				maxUsagePerUser: discount.maxUsagePerUser,
				isActive: discount.isActive,
				startsAt: discount.startsAt,
				endsAt: discount.endsAt,
			},
		});
	};

	const handleDuplicate = () => {
		duplicate(discount.id);
		drawer.close();
	};

	const handleViewUsages = () => {
		drawer.close();
		usagesDialog.open({ discountId: discount.id, discountCode: discount.code });
	};

	const handleToggle = () => {
		drawer.close();
		toggleAlert.open({
			discountId: discount.id,
			discountCode: discount.code,
			isActive: discount.isActive,
		});
	};

	const handleDelete = () => {
		drawer.close();
		deleteAlert.open({
			discountId: discount.id,
			discountCode: discount.code,
			usageCount: discount.usageCount,
		});
	};

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={discount.code}
			description={`${DISCOUNT_TYPE_LABELS[discount.type]} · ${formatValue(discount.type, discount.value)}`}
		>
			<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Code</dt>
				<dd>
					<code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs font-semibold">
						{discount.code}
					</code>
				</dd>
				<dt className="text-muted-foreground">Type</dt>
				<dd>
					{DISCOUNT_TYPE_ICONS[discount.type]} {DISCOUNT_TYPE_LABELS[discount.type]}
				</dd>
				<dt className="text-muted-foreground">Valeur</dt>
				<dd className="font-medium">{formatValue(discount.type, discount.value)}</dd>
				{discount.minOrderAmount !== null ? (
					<>
						<dt className="text-muted-foreground">Min commande</dt>
						<dd>{formatEuro(discount.minOrderAmount)}</dd>
					</>
				) : null}
				<dt className="text-muted-foreground">Utilisations</dt>
				<dd>{formatUsage(discount.usageCount, discount.maxUsageCount)}</dd>
				{discount.maxUsagePerUser !== null ? (
					<>
						<dt className="text-muted-foreground">Max / utilisateur</dt>
						<dd>{discount.maxUsagePerUser}</dd>
					</>
				) : null}
				<dt className="text-muted-foreground">Statut</dt>
				<dd>
					<Badge variant={status.variant}>{status.label}</Badge>
				</dd>
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleEdit}
				>
					<Pencil className="size-4" aria-hidden="true" />
					Modifier
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleDuplicate}
					disabled={isDuplicating}
				>
					<Copy className="size-4" aria-hidden="true" />
					Dupliquer
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleViewUsages}
				>
					<Eye className="size-4" aria-hidden="true" />
					Voir les utilisations
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleToggle}
				>
					{discount.isActive ? (
						<>
							<PowerOff className="size-4" aria-hidden="true" />
							Désactiver
						</>
					) : (
						<>
							<Power className="size-4" aria-hidden="true" />
							Activer
						</>
					)}
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="text-destructive hover:text-destructive h-12 justify-start gap-3"
					onClick={handleDelete}
					disabled={!canDelete}
				>
					<Trash2 className="size-4" aria-hidden="true" />
					Supprimer
				</Button>
			</div>
		</AdminItemDrawer>
	);
}
