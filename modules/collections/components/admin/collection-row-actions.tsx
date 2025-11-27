"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import {
	Archive,
	ArchiveRestore,
	Eye,
	FileEdit,
	MoreVertical,
	Pencil,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { COLLECTION_DIALOG_ID } from "./collection-form-dialog";
import { DELETE_COLLECTION_DIALOG_ID } from "./delete-collection-alert-dialog";
import { ARCHIVE_COLLECTION_DIALOG_ID } from "./archive-collection-alert-dialog";
import { CHANGE_COLLECTION_STATUS_DIALOG_ID } from "./change-collection-status-alert-dialog";

interface CollectionRowActionsProps {
	collectionId: string;
	collectionName: string;
	collectionSlug: string;
	collectionDescription: string | null;
	collectionImageUrl: string | null;
	collectionStatus: CollectionStatus;
	productsCount: number;
}

export function CollectionRowActions({
	collectionId,
	collectionName,
	collectionSlug,
	collectionDescription,
	collectionImageUrl,
	collectionStatus,
	productsCount,
}: CollectionRowActionsProps) {
	const { open: openEditDialog } = useDialog(COLLECTION_DIALOG_ID);
	const { open: openDeleteDialog } = useAlertDialog(DELETE_COLLECTION_DIALOG_ID);
	const { open: openArchiveDialog } = useAlertDialog(ARCHIVE_COLLECTION_DIALOG_ID);
	const { open: openChangeStatusDialog } = useAlertDialog(CHANGE_COLLECTION_STATUS_DIALOG_ID);

	const handleChangeStatus = (targetStatus: CollectionStatus) => {
		openChangeStatusDialog({
			collectionId,
			collectionName,
			currentStatus: collectionStatus,
			targetStatus,
		});
	};

	const handleArchive = () => {
		openArchiveDialog({
			collectionId,
			collectionName,
			collectionStatus,
		});
	};

	const handleDelete = () => {
		openDeleteDialog({
			collectionId,
			collectionName,
			productsCount,
		});
	};

	const isArchived = collectionStatus === CollectionStatus.ARCHIVED;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0"
					aria-label="Actions pour cette collection"
				>
					<span className="sr-only">Ouvrir le menu d'actions</span>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[200px]">
				{/* Voir - Page collection publique */}
				<DropdownMenuItem asChild>
					<Link href={`/collections/${collectionSlug}`} target="_blank">
						<Eye className="h-4 w-4" />
						Voir
					</Link>
				</DropdownMenuItem>

				{/* Modifier */}
				<DropdownMenuItem
					onClick={() => {
						openEditDialog({
							collection: {
								id: collectionId,
								name: collectionName,
								slug: collectionSlug,
								description: collectionDescription,
								imageUrl: collectionImageUrl,
								status: collectionStatus,
							},
						});
					}}
				>
					<Pencil className="h-4 w-4" />
					Modifier
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				{/* Actions conditionnelles selon le statut */}
				{!isArchived && (
					<>
						{/* Changer statut - Uniquement DRAFT/PUBLIC */}
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<FileEdit className="h-4 w-4" />
								<span>Changer statut</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuItem
									onClick={() => handleChangeStatus(CollectionStatus.DRAFT)}
									disabled={collectionStatus === CollectionStatus.DRAFT}
								>
									{COLLECTION_STATUS_LABELS[CollectionStatus.DRAFT]}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => handleChangeStatus(CollectionStatus.PUBLIC)}
									disabled={collectionStatus === CollectionStatus.PUBLIC}
								>
									{COLLECTION_STATUS_LABELS[CollectionStatus.PUBLIC]}
								</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuSub>

						<DropdownMenuSeparator />

						{/* Archiver */}
						<DropdownMenuItem onClick={handleArchive}>
							<Archive className="h-4 w-4" />
							Archiver
						</DropdownMenuItem>
					</>
				)}

				{isArchived && (
					<>
						{/* Restaurer */}
						<DropdownMenuItem onClick={handleArchive}>
							<ArchiveRestore className="h-4 w-4" />
							Restaurer
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						{/* Supprimer - Uniquement pour les collections archivees */}
						<DropdownMenuItem variant="destructive" onClick={handleDelete}>
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
