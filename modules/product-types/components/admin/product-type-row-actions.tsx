"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { PRODUCT_TYPE_DIALOG_ID } from "@/modules/product-types/components/product-type-form-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { ExternalLink, MoreVertical, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { DELETE_PRODUCT_TYPE_DIALOG_ID } from "./delete-product-type-alert-dialog";

interface ProductTypeRowActionsProps {
	productTypeId: string;
	isActive: boolean;
	isSystem?: boolean;
	label: string;
	description?: string | null;
	slug: string;
	productsCount?: number;
}

export function ProductTypeRowActions({
	productTypeId,
	isActive,
	isSystem = false,
	label,
	description,
	slug,
	productsCount = 0,
}: ProductTypeRowActionsProps) {
	const { open } = useDialog(PRODUCT_TYPE_DIALOG_ID);
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_TYPE_DIALOG_ID);

	const handleEdit = () => {
		open({
			productType: {
				id: productTypeId,
				label,
				description,
				slug,
			},
		});
	};

	const handleDelete = () => {
		deleteDialog.open({
			productTypeId,
			label,
			productsCount,
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{isSystem && (
					<>
						<DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
							<ShieldCheck className="h-3 w-3" />
							Type système protégé
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
					</>
				)}

				<DropdownMenuItem onClick={handleEdit} disabled={isSystem}>
					<Pencil className="h-4 w-4" />
					{isSystem ? "Voir (lecture seule)" : "Éditer"}
				</DropdownMenuItem>

				<DropdownMenuItem asChild>
					<Link href={`/admin/catalogue/produits?productTypeId=${productTypeId}`}>
						<ExternalLink className="h-4 w-4" />
						Voir les produits
					</Link>
				</DropdownMenuItem>

				{!isSystem && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleDelete}
							disabled={!isActive}
							className="text-destructive focus:text-destructive"
						>
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
