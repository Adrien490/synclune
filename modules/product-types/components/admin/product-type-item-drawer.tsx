"use client";

import { Copy, ExternalLink, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { PRODUCT_TYPE_DIALOG_ID } from "@/modules/product-types/components/product-type-form-dialog";
import { useDuplicateProductType } from "@/modules/product-types/hooks/use-duplicate-product-type";
import { DELETE_PRODUCT_TYPE_DIALOG_ID } from "./delete-product-type-alert-dialog";

export const PRODUCT_TYPE_ITEM_DRAWER_ID = "product-type-item-drawer";

export interface ProductTypeItemDrawerData {
	productType: {
		id: string;
		label: string;
		slug: string;
		description: string | null;
		isActive: boolean;
		isSystem: boolean;
		productsCount: number;
	};
	[key: string]: unknown;
}

export function ProductTypeItemDrawer() {
	const drawer = useDialog<ProductTypeItemDrawerData>(PRODUCT_TYPE_ITEM_DRAWER_ID);
	const formDialog = useDialog(PRODUCT_TYPE_DIALOG_ID);
	const deleteAlert = useAlertDialog(DELETE_PRODUCT_TYPE_DIALOG_ID);
	const { duplicateProductType, isPending: isDuplicating } = useDuplicateProductType({
		onSuccess: () => drawer.close(),
	});

	const productType = drawer.data?.productType;

	if (!productType) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const { id, label, slug, description, isActive, isSystem, productsCount } = productType;
	const productsLabel = `${productsCount} produit${productsCount !== 1 ? "s" : ""}`;
	const statusLabel = isActive ? "Actif" : "Inactif";

	const handleEdit = () => {
		if (isSystem) return;
		drawer.close();
		formDialog.open({ productType: { id, label, description, slug } });
	};

	const handleDelete = () => {
		drawer.close();
		deleteAlert.open({ productTypeId: id, label, productsCount });
	};

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={label}
			description={`${productsLabel} · ${statusLabel}`}
		>
			{isSystem ? (
				<p className="bg-muted text-muted-foreground flex items-center gap-2 rounded-md px-3 py-2 text-xs">
					<ShieldCheck className="size-4" aria-hidden="true" />
					Type système protégé (lecture seule).
				</p>
			) : null}

			<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Slug</dt>
				<dd className="truncate font-mono text-xs">{slug}</dd>
				{description ? (
					<>
						<dt className="text-muted-foreground">Description</dt>
						<dd className="text-pretty">{description}</dd>
					</>
				) : null}
				<dt className="text-muted-foreground">Statut</dt>
				<dd>
					<Badge variant={isActive ? "default" : "secondary"}>{statusLabel}</Badge>
				</dd>
				<dt className="text-muted-foreground">Produits</dt>
				<dd>{productsCount}</dd>
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleEdit}
					disabled={isSystem}
				>
					<Pencil className="size-4" aria-hidden="true" />
					{isSystem ? "Voir (lecture seule)" : "Éditer"}
				</Button>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link
						href={`/admin/catalogue/produits?productTypeId=${id}`}
						onClick={() => drawer.close()}
					>
						<ExternalLink className="size-4" aria-hidden="true" />
						Voir les produits
					</Link>
				</Button>
				{!isSystem ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={() => duplicateProductType(id)}
						disabled={isDuplicating}
					>
						<Copy className="size-4" aria-hidden="true" />
						Dupliquer
					</Button>
				) : null}
				{!isSystem ? (
					<Button
						variant="outline"
						size="lg"
						className="text-destructive hover:text-destructive h-12 justify-start gap-3"
						onClick={handleDelete}
						disabled={isDuplicating}
					>
						<Trash2 className="size-4" aria-hidden="true" />
						Supprimer
					</Button>
				) : null}
			</div>
		</AdminItemDrawer>
	);
}
