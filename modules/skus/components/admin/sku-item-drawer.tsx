"use client";

import { Check, Copy, DollarSign, Package, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { useDuplicateSku } from "@/modules/skus/hooks/use-duplicate-sku";
import { useSetDefaultSku } from "@/modules/skus/hooks/use-set-default-sku";
import { useUpdateProductSkuStatus } from "@/modules/skus/hooks/use-update-sku-status";

import { ADJUST_STOCK_DIALOG_ID } from "./adjust-stock-dialog";
import { DELETE_PRODUCT_SKU_DIALOG_ID } from "./delete-sku-alert-dialog";
import { UPDATE_PRICE_DIALOG_ID } from "./update-price-dialog";

export const SKU_ITEM_DRAWER_ID = "sku-item-drawer";

export interface SkuItemDrawerData {
	sku: {
		id: string;
		skuCode: string;
		productSlug: string;
		isDefault: boolean;
		isActive: boolean;
		inventory: number;
		priceInclTax: number;
		compareAtPrice: number | null;
		colorName: string | null;
		materialName: string | null;
		size: string | null;
	};
	[key: string]: unknown;
}

const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const formatPrice = (priceInCents: number) => PRICE_FORMATTER.format(priceInCents / 100);

const getStockVariant = (inventory: number): "destructive" | "warning" | "success" => {
	if (inventory === 0) return "destructive";
	if (inventory <= STOCK_THRESHOLDS.LOW) return "warning";
	return "success";
};

export function SkuItemDrawer() {
	const drawer = useDialog<SkuItemDrawerData>(SKU_ITEM_DRAWER_ID);
	const deleteAlert = useAlertDialog(DELETE_PRODUCT_SKU_DIALOG_ID);
	const adjustStockDialog = useDialog(ADJUST_STOCK_DIALOG_ID);
	const updatePriceDialog = useDialog(UPDATE_PRICE_DIALOG_ID);
	const { setAsDefault, isPending: isSettingDefault } = useSetDefaultSku();
	const { toggleStatus, isPending: isToggling } = useUpdateProductSkuStatus();
	const { duplicate, isPending: isDuplicating } = useDuplicateSku();

	const sku = drawer.data?.sku;

	if (!sku) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const {
		id,
		skuCode,
		productSlug,
		isDefault,
		isActive,
		inventory,
		priceInclTax,
		compareAtPrice,
		colorName,
		materialName,
		size,
	} = sku;

	const closeAndRun = (fn: () => void) => () => {
		drawer.close();
		fn();
	};

	const handleAdjustStock = closeAndRun(() =>
		adjustStockDialog.open({ skuId: id, skuName: skuCode, currentStock: inventory }),
	);
	const handleUpdatePrice = closeAndRun(() =>
		updatePriceDialog.open({
			skuId: id,
			skuName: skuCode,
			currentPrice: priceInclTax,
			currentCompareAtPrice: compareAtPrice,
		}),
	);
	const handleDuplicate = closeAndRun(() => duplicate(id, skuCode));
	const handleToggleStatus = closeAndRun(() => toggleStatus(id, !isActive));
	const handleSetDefault = closeAndRun(() => setAsDefault(id));
	const handleDelete = closeAndRun(() =>
		deleteAlert.open({ skuId: id, skuName: skuCode, isDefault }),
	);

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={skuCode}
			description={`${formatPrice(priceInclTax)} · ${inventory} en stock`}
		>
			<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Prix</dt>
				<dd className="font-medium">{formatPrice(priceInclTax)}</dd>
				{compareAtPrice ? (
					<>
						<dt className="text-muted-foreground">Prix barré</dt>
						<dd className="text-muted-foreground line-through">{formatPrice(compareAtPrice)}</dd>
					</>
				) : null}
				<dt className="text-muted-foreground">Stock</dt>
				<dd>
					<Badge variant={getStockVariant(inventory)}>{inventory}</Badge>
				</dd>
				{colorName ? (
					<>
						<dt className="text-muted-foreground">Couleur</dt>
						<dd>{colorName}</dd>
					</>
				) : null}
				{materialName ? (
					<>
						<dt className="text-muted-foreground">Matériau</dt>
						<dd>{materialName}</dd>
					</>
				) : null}
				{size ? (
					<>
						<dt className="text-muted-foreground">Taille</dt>
						<dd>{size}</dd>
					</>
				) : null}
				<dt className="text-muted-foreground">Statut</dt>
				<dd className="flex flex-wrap gap-1">
					<Badge variant={isActive ? "default" : "secondary"}>
						{isActive ? "Active" : "Inactive"}
					</Badge>
					{isDefault ? <Badge variant="secondary">Par défaut</Badge> : null}
				</dd>
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link
						href={`/admin/catalogue/produits/${productSlug}/variantes/${id}/modifier`}
						onClick={() => drawer.close()}
					>
						<Pencil className="size-4" aria-hidden="true" />
						Modifier
					</Link>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleAdjustStock}
				>
					<Package className="size-4" aria-hidden="true" />
					Ajuster le stock
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleUpdatePrice}
				>
					<DollarSign className="size-4" aria-hidden="true" />
					Modifier le prix
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
				{!isDefault ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleToggleStatus}
						disabled={isToggling}
					>
						{isActive ? (
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
				) : null}
				{!isDefault ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleSetDefault}
						disabled={isSettingDefault}
					>
						<Check className="size-4" aria-hidden="true" />
						Définir par défaut
					</Button>
				) : null}
				{!isDefault ? (
					<Button
						variant="outline"
						size="lg"
						className="text-destructive hover:text-destructive h-12 justify-start gap-3"
						onClick={handleDelete}
					>
						<Trash2 className="size-4" aria-hidden="true" />
						Supprimer
					</Button>
				) : null}
			</div>
		</AdminItemDrawer>
	);
}
