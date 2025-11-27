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
import { Check, MoreVertical, Trash2 } from "lucide-react";
import { DELETE_PRODUCT_SKU_DIALOG_ID } from "./delete-sku-alert-dialog";

interface ProductSkuRowActionsProps {
	skuId: string;
	skuName: string;
	isDefault?: boolean;
}

export function ProductSkuRowActions({
	skuId,
	skuName,
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
					aria-label="Actions"
				>
					<MoreVertical className="h-4 w-4" />
					<span className="sr-only">Actions</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{!isDefault ? (
					<>
						<DropdownMenuItem onClick={handleSetDefault} disabled={isPending}>
							<Check className="h-4 w-4" />
							Définir par défaut
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleDelete}
							className="text-destructive focus:text-destructive"
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
