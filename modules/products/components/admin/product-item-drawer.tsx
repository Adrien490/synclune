"use client";

import {
	Archive,
	ArchiveRestore,
	Copy,
	Eye,
	FolderPlus,
	LayoutList,
	Pencil,
	Trash2,
} from "lucide-react";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { ARCHIVE_PRODUCT_DIALOG_ID } from "./archive-product-alert-dialog";
import { CHANGE_PRODUCT_STATUS_DIALOG_ID } from "./change-product-status-alert-dialog";
import { DELETE_PRODUCT_DIALOG_ID } from "./delete-product-alert-dialog";
import { DUPLICATE_PRODUCT_DIALOG_ID } from "./duplicate-product-alert-dialog";
import { MANAGE_COLLECTIONS_DIALOG_ID } from "./manage-collections-dialog";

export const PRODUCT_ITEM_DRAWER_ID = "product-item-drawer";

type ProductStatus = "DRAFT" | "PUBLIC" | "ARCHIVED";

export interface ProductItemDrawerData {
	product: {
		id: string;
		slug: string;
		title: string;
		status: ProductStatus;
		priceDisplay: string;
		stock: number;
		variantsCount: number;
		typeLabel: string | null;
	};
	[key: string]: unknown;
}

const STATUS_CONFIG: Record<
	ProductStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	PUBLIC: { label: "Public", variant: "default" },
	DRAFT: { label: "Brouillon", variant: "secondary" },
	ARCHIVED: { label: "Archivé", variant: "outline" },
};

export function ProductItemDrawer() {
	const drawer = useDialog<ProductItemDrawerData>(PRODUCT_ITEM_DRAWER_ID);
	const deleteAlert = useAlertDialog(DELETE_PRODUCT_DIALOG_ID);
	const changeStatusAlert = useAlertDialog(CHANGE_PRODUCT_STATUS_DIALOG_ID);
	const archiveAlert = useAlertDialog(ARCHIVE_PRODUCT_DIALOG_ID);
	const duplicateAlert = useAlertDialog(DUPLICATE_PRODUCT_DIALOG_ID);
	const collectionsDialog = useDialog(MANAGE_COLLECTIONS_DIALOG_ID);

	const product = drawer.data?.product;

	if (!product) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const { id, slug, title, status, priceDisplay, stock, variantsCount, typeLabel } = product;
	const statusConfig = STATUS_CONFIG[status];
	const isArchived = status === "ARCHIVED";

	const closeAndOpen = (openFn: () => void) => () => {
		drawer.close();
		openFn();
	};

	const handleDuplicate = closeAndOpen(() =>
		duplicateAlert.open({ productId: id, productTitle: title }),
	);
	const handleManageCollections = closeAndOpen(() =>
		collectionsDialog.open({ productId: id, productTitle: title }),
	);
	const handleChangeStatus = (targetStatus: ProductStatus) =>
		closeAndOpen(() =>
			changeStatusAlert.open({
				productId: id,
				productTitle: title,
				currentStatus: status,
				targetStatus,
			}),
		);
	const handleArchive = closeAndOpen(() =>
		archiveAlert.open({ productId: id, productTitle: title, productStatus: status }),
	);
	const handleDelete = closeAndOpen(() => deleteAlert.open({ productId: id, productTitle: title }));

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={title}
			description={`${priceDisplay} · ${stock} en stock`}
		>
			<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Prix</dt>
				<dd className="font-medium">{priceDisplay}</dd>
				<dt className="text-muted-foreground">Stock</dt>
				<dd>{stock}</dd>
				<dt className="text-muted-foreground">Variantes</dt>
				<dd>{variantsCount}</dd>
				{typeLabel ? (
					<>
						<dt className="text-muted-foreground">Type</dt>
						<dd>{typeLabel}</dd>
					</>
				) : null}
				<dt className="text-muted-foreground">Statut</dt>
				<dd>
					<Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
				</dd>
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link
						href={`/creations/${slug}`}
						target="_blank"
						rel="noopener noreferrer"
						onClick={() => drawer.close()}
					>
						<Eye className="size-4" aria-hidden="true" />
						Voir sur la boutique
					</Link>
				</Button>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link href={`/admin/catalogue/produits/${slug}/modifier`} onClick={() => drawer.close()}>
						<Pencil className="size-4" aria-hidden="true" />
						Modifier
					</Link>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleDuplicate}
				>
					<Copy className="size-4" aria-hidden="true" />
					Dupliquer
				</Button>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link href={`/admin/catalogue/produits/${slug}/variantes`} onClick={() => drawer.close()}>
						<LayoutList className="size-4" aria-hidden="true" />
						Gérer variantes
					</Link>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleManageCollections}
				>
					<FolderPlus className="size-4" aria-hidden="true" />
					Gérer collections
				</Button>

				{!isArchived ? (
					<>
						{status !== "DRAFT" ? (
							<Button
								variant="outline"
								size="lg"
								className="h-12 justify-start gap-3"
								onClick={handleChangeStatus("DRAFT")}
							>
								<Pencil className="size-4" aria-hidden="true" />
								Passer en brouillon
							</Button>
						) : null}
						{status !== "PUBLIC" ? (
							<Button
								variant="outline"
								size="lg"
								className="h-12 justify-start gap-3"
								onClick={handleChangeStatus("PUBLIC")}
							>
								<Eye className="size-4" aria-hidden="true" />
								Passer en public
							</Button>
						) : null}
						<Button
							variant="outline"
							size="lg"
							className="h-12 justify-start gap-3"
							onClick={handleArchive}
						>
							<Archive className="size-4" aria-hidden="true" />
							Archiver
						</Button>
					</>
				) : (
					<>
						<Button
							variant="outline"
							size="lg"
							className="h-12 justify-start gap-3"
							onClick={handleArchive}
						>
							<ArchiveRestore className="size-4" aria-hidden="true" />
							Restaurer
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="text-destructive hover:text-destructive h-12 justify-start gap-3"
							onClick={handleDelete}
						>
							<Trash2 className="size-4" aria-hidden="true" />
							Supprimer
						</Button>
					</>
				)}
			</div>
		</AdminItemDrawer>
	);
}
