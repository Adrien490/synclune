"use client";

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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import {
	Archive,
	ArchiveRestore,
	Copy,
	Eye,
	FileEdit,
	FolderPlus,
	LayoutList,
	MoreVertical,
	Pencil,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { ARCHIVE_PRODUCT_DIALOG_ID } from "./archive-product-alert-dialog";
import { CHANGE_PRODUCT_STATUS_DIALOG_ID } from "./change-product-status-alert-dialog";
import { DELETE_PRODUCT_DIALOG_ID } from "./delete-product-alert-dialog";
import { DUPLICATE_PRODUCT_DIALOG_ID } from "./duplicate-product-alert-dialog";
import { MANAGE_COLLECTIONS_DIALOG_ID } from "./manage-collections-dialog";

interface ProductRowActionsProps {
	productId: string;
	productSlug: string;
	productTitle: string;
	productStatus: "DRAFT" | "PUBLIC" | "ARCHIVED";
}

export function ProductRowActions({
	productId,
	productSlug,
	productTitle,
	productStatus,
}: ProductRowActionsProps) {
	const deleteDialog = useAlertDialog(DELETE_PRODUCT_DIALOG_ID);
	const changeStatusDialog = useAlertDialog(CHANGE_PRODUCT_STATUS_DIALOG_ID);
	const archiveDialog = useAlertDialog(ARCHIVE_PRODUCT_DIALOG_ID);
	const duplicateDialog = useAlertDialog(DUPLICATE_PRODUCT_DIALOG_ID);
	const collectionsDialog = useDialog(MANAGE_COLLECTIONS_DIALOG_ID);

	const handleManageCollections = () => {
		collectionsDialog.open({
			productId,
			productTitle,
		});
	};

	const handleChangeStatus = (
		targetStatus: "DRAFT" | "PUBLIC" | "ARCHIVED"
	) => {
		changeStatusDialog.open({
			productId,
			productTitle,
			currentStatus: productStatus,
			targetStatus,
		});
	};

	const handleDuplicate = () => {
		duplicateDialog.open({
			productId,
			productTitle,
		});
	};

	const handleArchive = () => {
		archiveDialog.open({
			productId,
			productTitle,
			productStatus,
		});
	};

	const handleDelete = () => {
		deleteDialog.open({
			productId,
			productTitle,
		});
	};

	const isArchived = productStatus === "ARCHIVED";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0 active:scale-95 transition-transform"
					aria-label="Actions pour ce bijou"
				>
					<span className="sr-only">Ouvrir le menu d'actions</span>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[200px]">
				{/* ACTIONS COMMUNES À TOUS LES BIJOUX */}

				{/* Voir - Page détails produit */}
				<DropdownMenuItem asChild>
					<Link href={`/creations/${productSlug}`} target="_blank">
						<Eye className="h-4 w-4" />
						Voir
					</Link>
				</DropdownMenuItem>

				{/* Modifier - Édition complète */}
				<DropdownMenuItem asChild>
					<Link
						href={`/admin/catalogue/produits/${productSlug}/modifier`}
					>
						<Pencil className="h-4 w-4" />
						Modifier
					</Link>
				</DropdownMenuItem>

				{/* Dupliquer - Créer une copie */}
				<DropdownMenuItem onClick={handleDuplicate}>
					<Copy className="h-4 w-4" />
					Dupliquer
				</DropdownMenuItem>

				{/* Gérer variantes - Ouvre la liste des SKUs associés */}
				<DropdownMenuItem asChild>
					<Link
						href={`/admin/catalogue/produits/${productSlug}/variantes`}
					>
						<LayoutList className="h-4 w-4" />
						Gérer variantes
					</Link>
				</DropdownMenuItem>

				{/* Gérer collections */}
				<DropdownMenuItem onClick={handleManageCollections}>
					<FolderPlus className="h-4 w-4" />
					Gérer collections
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				{/* ACTIONS CONDITIONNELLES SELON LE STATUT */}

				{!isArchived && (
					<>
						{/* Changer statut - Uniquement pour produits non-archivés */}
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<FileEdit className="h-4 w-4" />
								<span>Changer statut</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuItem
									onClick={() => handleChangeStatus("DRAFT")}
									disabled={productStatus === "DRAFT"}
								>
									Brouillon
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => handleChangeStatus("PUBLIC")}
									disabled={productStatus === "PUBLIC"}
								>
									Public
								</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuSub>

						<DropdownMenuSeparator />

						{/* Archiver - Action directe pour produits actifs */}
						<DropdownMenuItem onClick={handleArchive}>
							<Archive className="h-4 w-4" />
							Archiver
						</DropdownMenuItem>
					</>
				)}

				{isArchived && (
					<>
						{/* Restaurer - Action directe pour produits archivés */}
						<DropdownMenuItem onClick={handleArchive}>
							<ArchiveRestore className="h-4 w-4" />
							Restaurer
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						{/* Supprimer - Uniquement pour les produits archivés */}
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
