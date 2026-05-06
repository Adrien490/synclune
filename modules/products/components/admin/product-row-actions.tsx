"use client";

import {
	Archive,
	ArchiveRestore,
	Copy,
	EllipsisVertical,
	Eye,
	FolderPlus,
	LayoutList,
	Pencil,
	Trash2,
	Upload,
} from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

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

	const isArchived = productStatus === "ARCHIVED";
	const isDraft = productStatus === "DRAFT";
	const isPublic = productStatus === "PUBLIC";

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "view",
					label: "Voir la fiche",
					icon: Eye,
					href: `/creations/${productSlug}`,
					external: true,
				},
				{
					key: "edit",
					label: "Modifier",
					icon: Pencil,
					href: `/admin/catalogue/produits/${productSlug}/modifier`,
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: Copy,
					onSelect: () => duplicateDialog.open({ productId, productTitle }),
				},
				{
					key: "variants",
					label: "Gérer variantes",
					icon: LayoutList,
					href: `/admin/catalogue/produits/${productSlug}/variantes`,
				},
				{
					key: "collections",
					label: "Gérer collections",
					icon: FolderPlus,
					onSelect: () => collectionsDialog.open({ productId, productTitle }),
				},
			],
		},
		{
			key: "status",
			label: "Statut",
			items: [
				{
					key: "draft",
					label: "Marquer comme brouillon",
					icon: Pencil,
					disabled: isDraft,
					hidden: isArchived,
					onSelect: () =>
						changeStatusDialog.open({
							productId,
							productTitle,
							currentStatus: productStatus,
							targetStatus: "DRAFT",
						}),
				},
				{
					key: "public",
					label: "Publier",
					description: "Rendre visible sur la boutique",
					icon: Upload,
					disabled: isPublic,
					hidden: isArchived,
					onSelect: () =>
						changeStatusDialog.open({
							productId,
							productTitle,
							currentStatus: productStatus,
							targetStatus: "PUBLIC",
						}),
				},
			],
		},
		{
			key: "archive",
			items: [
				{
					key: "archive",
					label: "Archiver",
					icon: Archive,
					hidden: isArchived,
					onSelect: () => archiveDialog.open({ productId, productTitle, productStatus }),
				},
				{
					key: "restore",
					label: "Restaurer",
					icon: ArchiveRestore,
					hidden: !isArchived,
					onSelect: () => archiveDialog.open({ productId, productTitle, productStatus }),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer définitivement",
					description: "Action irréversible",
					icon: Trash2,
					variant: "destructive",
					hidden: !isArchived,
					onSelect: () => deleteDialog.open({ productId, productTitle }),
				},
			],
		},
	];

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 transition-transform active:scale-95"
					aria-label={`Actions pour ${productTitle}`}
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent title="Actions" description={productTitle} sections={sections} />
		</ResponsiveActionMenu>
	);
}
