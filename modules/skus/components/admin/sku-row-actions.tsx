"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useSetDefaultSku } from "@/modules/skus/hooks/use-set-default-sku";
import { useUpdateProductSkuStatus } from "@/modules/skus/hooks/use-update-sku-status";
import { useDuplicateSku } from "@/modules/skus/hooks/use-duplicate-sku";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { Check, Copy, DollarSign, MoreVertical, Package, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { DELETE_PRODUCT_SKU_DIALOG_ID } from "./delete-sku-alert-dialog";
import { ADJUST_STOCK_DIALOG_ID } from "./adjust-stock-dialog";
import { UPDATE_PRICE_DIALOG_ID } from "./update-price-dialog";

interface ProductSkuRowActionsProps {
	skuId: string;
	skuName: string;
	productSlug: string;
	isDefault?: boolean;
	isActive?: boolean;
	inventory?: number;
	priceInclTax?: number;
	compareAtPrice?: number | null;
}

export function ProductSkuRowActions({
	skuId,
	skuName,
	productSlug,
	isDefault = false,
	isActive = true,
	inventory = 0,
	priceInclTax = 0,
	compareAtPrice = null,
}: ProductSkuRowActionsProps) {
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_SKU_DIALOG_ID);
	const adjustStockDialog = useDialog(ADJUST_STOCK_DIALOG_ID);
	const updatePriceDialog = useDialog(UPDATE_PRICE_DIALOG_ID);
	const { setAsDefault, isPending } = useSetDefaultSku();
	const { toggleStatus, isPending: isToggling } = useUpdateProductSkuStatus();
	const { duplicate, isPending: isDuplicating } = useDuplicateSku();

	const handleDelete = () => {
		deleteDialog.open({
			skuId,
			skuName,
			isDefault,
		});
	};

	const handleSetDefault = () => {
		setAsDefault(skuId);
	};

	const handleToggleStatus = () => {
		toggleStatus(skuId, !isActive);
	};

	const handleAdjustStock = () => {
		adjustStockDialog.open({
			skuId,
			skuName,
			currentStock: inventory,
		});
	};

	const handleUpdatePrice = () => {
		updatePriceDialog.open({
			skuId,
			skuName,
			currentPrice: priceInclTax,
			currentCompareAtPrice: compareAtPrice,
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0"
					aria-label="Actions pour cette variante"
				>
					<MoreVertical className="h-4 w-4" />
					<span className="sr-only">Ouvrir le menu d'actions</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[180px]">
				{/* Modifier */}
				<DropdownMenuItem asChild>
					<Link
						href={`/admin/catalogue/produits/${productSlug}/variantes/${skuId}/modifier`}
					>
						<Pencil className="h-4 w-4" />
						Modifier
					</Link>
				</DropdownMenuItem>

				{/* Activer/Désactiver - Non disponible pour la variante par défaut */}
				{!isDefault && (
					<DropdownMenuItem
						onClick={handleToggleStatus}
						disabled={isToggling}
					>
						{isActive ? (
							<>
								<PowerOff className="h-4 w-4" />
								Désactiver
							</>
						) : (
							<>
								<Power className="h-4 w-4" />
								Activer
							</>
						)}
					</DropdownMenuItem>
				)}

				{/* Ajuster stock */}
				<DropdownMenuItem onClick={handleAdjustStock}>
					<Package className="h-4 w-4" />
					Ajuster le stock
				</DropdownMenuItem>

				{/* Modifier prix */}
				<DropdownMenuItem onClick={handleUpdatePrice}>
					<DollarSign className="h-4 w-4" />
					Modifier le prix
				</DropdownMenuItem>

				{/* Dupliquer */}
				<DropdownMenuItem
					onClick={() => duplicate(skuId, skuName)}
					disabled={isDuplicating}
				>
					<Copy className="h-4 w-4" />
					Dupliquer
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				{!isDefault ? (
					<>
						<DropdownMenuItem onClick={handleSetDefault} disabled={isPending}>
							<Check className="h-4 w-4" />
							Définir par défaut
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={handleDelete}
						>
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</>
				) : (
					<DropdownMenuItem disabled className="text-muted-foreground">
						Variante par défaut
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
