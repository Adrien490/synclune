"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useSetDefaultSku } from "@/modules/skus/hooks/admin/use-set-default-sku";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Check, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { DELETE_PRODUCT_SKU_DIALOG_ID } from "./delete-sku-alert-dialog";

interface ProductSkuRowActionsProps {
	skuId: string;
	skuName: string;
	productSlug: string;
	isDefault?: boolean;
}

export function ProductSkuRowActions({
	skuId,
	skuName,
	productSlug,
	isDefault = false,
}: ProductSkuRowActionsProps) {
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_SKU_DIALOG_ID);
	const { setAsDefault, isPending } = useSetDefaultSku();

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
