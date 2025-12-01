"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useUpdateProductSkuStatus } from "@/modules/skus/hooks/use-update-sku-status";
import {
	DollarSign,
	ExternalLink,
	MoreVertical,
	Package,
	Power,
	PowerOff,
} from "lucide-react";
import Link from "next/link";
import { ADJUST_STOCK_DIALOG_ID } from "./adjust-stock-dialog";
import { UPDATE_PRICE_DIALOG_ID } from "./update-price-dialog";

interface InventoryRowActionsProps {
	skuId: string;
	skuName: string;
	productSlug: string;
	inventory?: number;
	priceInclTax?: number;
	compareAtPrice?: number | null;
	isActive?: boolean;
	isDefault?: boolean;
}

export function InventoryRowActions({
	skuId,
	skuName,
	productSlug,
	inventory = 0,
	priceInclTax = 0,
	compareAtPrice = null,
	isActive = true,
	isDefault = false,
}: InventoryRowActionsProps) {
	const adjustStockDialog = useDialog(ADJUST_STOCK_DIALOG_ID);
	const updatePriceDialog = useDialog(UPDATE_PRICE_DIALOG_ID);
	const { toggleStatus, isPending: isToggling } = useUpdateProductSkuStatus();

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

	const handleToggleStatus = () => {
		toggleStatus(skuId, !isActive);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0"
					aria-label="Actions pour cet article"
				>
					<MoreVertical className="h-4 w-4" />
					<span className="sr-only">Ouvrir le menu d'actions</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[180px]">
				{/* Actions inventaire */}
				<DropdownMenuItem onClick={handleAdjustStock}>
					<Package className="h-4 w-4" />
					Ajuster le stock
				</DropdownMenuItem>

				<DropdownMenuItem onClick={handleUpdatePrice}>
					<DollarSign className="h-4 w-4" />
					Modifier le prix
				</DropdownMenuItem>

				<DropdownMenuItem
					onClick={handleToggleStatus}
					disabled={isToggling || isDefault}
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

				<DropdownMenuSeparator />

				{/* Lien vers la fiche complète */}
				<DropdownMenuItem asChild>
					<Link
						href={`/admin/catalogue/produits/${productSlug}/variantes/${skuId}/modifier`}
					>
						<ExternalLink className="h-4 w-4" />
						Voir la fiche
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
