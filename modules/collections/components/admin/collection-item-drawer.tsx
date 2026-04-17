"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { Archive, ArchiveRestore, Eye, Package, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";
import { COLLECTION_DIALOG_ID } from "./collection-form-dialog";
import { DELETE_COLLECTION_DIALOG_ID } from "./delete-collection-alert-dialog";
import { ARCHIVE_COLLECTION_DIALOG_ID } from "./archive-collection-alert-dialog";
import { CHANGE_COLLECTION_STATUS_DIALOG_ID } from "./change-collection-status-alert-dialog";

export const COLLECTION_ITEM_DRAWER_ID = "collection-item-drawer";

export interface CollectionItemDrawerData {
	collection: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		status: CollectionStatus;
		productsCount: number;
	};
	[key: string]: unknown;
}

const STATUS_VARIANTS: Record<CollectionStatus, "default" | "secondary" | "outline"> = {
	[CollectionStatus.PUBLIC]: "default",
	[CollectionStatus.DRAFT]: "secondary",
	[CollectionStatus.ARCHIVED]: "outline",
};

export function CollectionItemDrawer() {
	const drawer = useDialog<CollectionItemDrawerData>(COLLECTION_ITEM_DRAWER_ID);
	const formDialog = useDialog(COLLECTION_DIALOG_ID);
	const deleteAlert = useAlertDialog(DELETE_COLLECTION_DIALOG_ID);
	const archiveAlert = useAlertDialog(ARCHIVE_COLLECTION_DIALOG_ID);
	const changeStatusAlert = useAlertDialog(CHANGE_COLLECTION_STATUS_DIALOG_ID);

	const collection = drawer.data?.collection;

	if (!collection) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const { id, name, slug, description, status, productsCount } = collection;
	const statusLabel = COLLECTION_STATUS_LABELS[status];
	const isArchived = status === CollectionStatus.ARCHIVED;

	const handleEdit = () => {
		drawer.close();
		formDialog.open({
			collection: { id, name, slug, description, status },
		});
	};

	const handleChangeStatus = (targetStatus: CollectionStatus) => {
		drawer.close();
		changeStatusAlert.open({
			collectionId: id,
			collectionName: name,
			currentStatus: status,
			targetStatus,
		});
	};

	const handleArchive = () => {
		drawer.close();
		archiveAlert.open({ collectionId: id, collectionName: name, collectionStatus: status });
	};

	const handleDelete = () => {
		drawer.close();
		deleteAlert.open({ collectionId: id, collectionName: name, productsCount });
	};

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={name}
			description={`${productsCount} produit${productsCount !== 1 ? "s" : ""} · ${statusLabel}`}
		>
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
					<Badge variant={STATUS_VARIANTS[status]}>{statusLabel}</Badge>
				</dd>
				<dt className="text-muted-foreground">Produits</dt>
				<dd>{productsCount}</dd>
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link
						href={`/collections/${slug}`}
						target="_blank"
						rel="noopener noreferrer"
						onClick={() => drawer.close()}
					>
						<Eye className="size-4" aria-hidden="true" />
						Voir sur la boutique
					</Link>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleEdit}
				>
					<Pencil className="size-4" aria-hidden="true" />
					Modifier
				</Button>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link href={`/admin/catalogue/collections/${slug}`} onClick={() => drawer.close()}>
						<Package className="size-4" aria-hidden="true" />
						Gérer les produits
					</Link>
				</Button>

				{!isArchived ? (
					<>
						{status !== CollectionStatus.DRAFT ? (
							<Button
								variant="outline"
								size="lg"
								className="h-12 justify-start gap-3"
								onClick={() => handleChangeStatus(CollectionStatus.DRAFT)}
							>
								<Pencil className="size-4" aria-hidden="true" />
								Passer en {COLLECTION_STATUS_LABELS[CollectionStatus.DRAFT]}
							</Button>
						) : null}
						{status !== CollectionStatus.PUBLIC ? (
							<Button
								variant="outline"
								size="lg"
								className="h-12 justify-start gap-3"
								onClick={() => handleChangeStatus(CollectionStatus.PUBLIC)}
							>
								<Eye className="size-4" aria-hidden="true" />
								Passer en {COLLECTION_STATUS_LABELS[CollectionStatus.PUBLIC]}
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
