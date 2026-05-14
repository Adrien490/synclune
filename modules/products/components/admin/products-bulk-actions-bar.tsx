"use client";

import {
	ArchiveRestore,
	ArchiveX,
	FolderPlus,
	Loader2,
	MoreHorizontal,
	Pencil,
	Trash2,
	Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ProductStatus } from "@/app/generated/prisma/enums";
import { BulkSelectionToolbar, useBulkSelectionContext } from "@/shared/components/data-table";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogHeroIcon,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { useBulkActionWithToast } from "@/shared/hooks/use-bulk-action-with-toast";

import { bulkArchiveProducts } from "../../actions/bulk-archive-products";
import { bulkChangeProductStatus } from "../../actions/bulk-change-product-status";
import { bulkDeleteProducts } from "../../actions/bulk-delete-products";

import { BulkAttachCollectionSheet } from "./bulk-attach-collection-sheet";

type ArchiveTarget = "ARCHIVED" | "PUBLIC";
type StatusTarget = "DRAFT" | "PUBLIC";
type PendingDialog =
	| { kind: "archive"; target: ArchiveTarget }
	| { kind: "delete" }
	| { kind: "status"; target: StatusTarget }
	| null;

interface ProductsBulkActionsBarProps {
	/** @default "inline" — desktop. `"bottom-bar"` rend les boutons full-width pour mobile selection. */
	presentation?: "inline" | "bottom-bar";
	/** Collections disponibles pour le bulk-attach. Fournies par la page parente. */
	collections?: Array<{ id: string; name: string }>;
}

interface ArchiveSnapshot {
	ids: string[];
	targetStatus: ArchiveTarget;
}

export function ProductsBulkActionsBar({
	presentation = "inline",
	collections = [],
}: ProductsBulkActionsBarProps) {
	const { selectedIds, selectedCount } = useBulkSelectionContext();
	const pending = useAdminListPendingContextOptional();
	const [pendingDialog, setPendingDialog] = useState<PendingDialog>(null);
	const [attachOpen, setAttachOpen] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);

	const archive = useBulkActionWithToast<ArchiveSnapshot>(bulkArchiveProducts, {
		undo: {
			buildUndoFormData: (snap) => {
				const fd = new FormData();
				fd.set("productIds", JSON.stringify(snap.ids));
				fd.set("targetStatus", snap.targetStatus === "ARCHIVED" ? "PUBLIC" : "ARCHIVED");
				return fd;
			},
		},
	});

	const deleteAction = useBulkActionWithToast(bulkDeleteProducts);
	const statusAction = useBulkActionWithToast(bulkChangeProductStatus);

	const isPending = archive.isPending || deleteAction.isPending || statusAction.isPending;
	const isBottomBar = presentation === "bottom-bar";
	const buttonSize = isBottomBar ? "default" : "sm";
	const noSelection = selectedCount === 0;

	// Clear pending state when the action lifecycle completes (success or error).
	const wasPendingRef = useRef(false);
	useEffect(() => {
		if (wasPendingRef.current && !isPending) {
			pending?.clearPending();
		}
		wasPendingRef.current = isPending;
	}, [isPending, pending]);

	function confirmArchive() {
		if (!pendingDialog || pendingDialog.kind !== "archive") return;
		const ids = Array.from(selectedIds);
		const fd = new FormData();
		fd.set("productIds", JSON.stringify(ids));
		fd.set("targetStatus", pendingDialog.target);
		pending?.startPending(ids, pendingDialog.target === "ARCHIVED" ? "archive" : "restore");
		archive.submit(fd, { ids, targetStatus: pendingDialog.target });
		setPendingDialog(null);
	}

	function confirmDelete() {
		const ids = Array.from(selectedIds);
		const fd = new FormData();
		fd.set("productIds", JSON.stringify(ids));
		pending?.startPending(ids, "delete");
		deleteAction.submit(fd);
		setPendingDialog(null);
	}

	function confirmStatus() {
		if (!pendingDialog || pendingDialog.kind !== "status") return;
		const ids = Array.from(selectedIds);
		const fd = new FormData();
		fd.set("productIds", JSON.stringify(ids));
		fd.set("targetStatus", pendingDialog.target);
		pending?.startPending(ids, "status");
		statusAction.submit(fd);
		setPendingDialog(null);
	}

	const moreSections: ActionMenuSection[] = [
		{
			key: "status",
			label: "Statut",
			items: [
				{
					key: "publish",
					label: "Publier",
					description: "Rendre visibles sur la boutique",
					icon: Upload,
					closesMenu: false,
					onSelect: () => setPendingDialog({ kind: "status", target: "PUBLIC" }),
				},
				{
					key: "draft",
					label: "Marquer comme brouillon",
					icon: Pencil,
					closesMenu: false,
					onSelect: () => setPendingDialog({ kind: "status", target: "DRAFT" }),
				},
			],
		},
		{
			key: "collection",
			items: [
				{
					key: "attach-collection",
					label: "Lier à une collection",
					icon: FolderPlus,
					disabled: collections.length === 0,
					closesMenu: false,
					onSelect: () => setAttachOpen(true),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer définitivement",
					description: "Brouillons et archivés uniquement",
					icon: Trash2,
					variant: "destructive",
					closesMenu: false,
					onSelect: () => setPendingDialog({ kind: "delete" }),
				},
			],
		},
	];

	const isArchiveDialog = pendingDialog?.kind === "archive";
	const isStatusDialog = pendingDialog?.kind === "status";
	const isDeleteDialog = pendingDialog?.kind === "delete";
	const archiveTarget = pendingDialog?.kind === "archive" ? pendingDialog.target : null;
	const statusTarget = pendingDialog?.kind === "status" ? pendingDialog.target : null;

	return (
		<>
			<BulkSelectionToolbar
				itemsLabel={{ singular: "produit", plural: "produits" }}
				presentation={presentation}
				aria-busy={isPending}
			>
				<Button
					type="button"
					variant="outline"
					size={buttonSize}
					onClick={() => setPendingDialog({ kind: "archive", target: ProductStatus.PUBLIC })}
					disabled={isPending || noSelection}
				>
					<ArchiveRestore className="size-4" aria-hidden="true" />
					Restaurer
				</Button>
				<Button
					type="button"
					variant="destructive"
					size={buttonSize}
					onClick={() => setPendingDialog({ kind: "archive", target: ProductStatus.ARCHIVED })}
					disabled={isPending || noSelection}
				>
					<ArchiveX className="size-4" aria-hidden="true" />
					Archiver
				</Button>

				<ResponsiveActionMenu open={moreOpen} onOpenChange={setMoreOpen}>
					<ResponsiveActionMenuTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size={buttonSize}
							disabled={isPending || noSelection}
							aria-label={`Plus d'actions sur ${selectedCount} produit${selectedCount > 1 ? "s" : ""}`}
							className={isBottomBar ? "shrink-0" : undefined}
						>
							<MoreHorizontal className="size-4" aria-hidden="true" />
							{!isBottomBar && <span className="sr-only">Plus d'actions</span>}
						</Button>
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Plus d'actions"
						description={`${selectedCount} bijou${selectedCount > 1 ? "x" : ""} sélectionné${selectedCount > 1 ? "s" : ""}`}
						sections={moreSections}
					/>
				</ResponsiveActionMenu>
			</BulkSelectionToolbar>

			{/* Archive / Restore confirm */}
			<ResponsiveAlertDialog
				open={isArchiveDialog}
				onOpenChange={(next) => {
					if (!next && !isPending) setPendingDialog(null);
				}}
				tone={archiveTarget === "ARCHIVED" ? "warning" : "success"}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon
						icon={archiveTarget === "ARCHIVED" ? ArchiveX : ArchiveRestore}
					/>
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{archiveTarget === "ARCHIVED"
								? `Remiser ${selectedCount} bijou${selectedCount > 1 ? "x" : ""} à l'atelier ?`
								: `Réexposer ${selectedCount} bijou${selectedCount > 1 ? "x" : ""} en vitrine ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{archiveTarget === "ARCHIVED"
								? `${selectedCount > 1 ? "Les bijoux archivés ne seront" : "Le bijou archivé ne sera"} plus visible${selectedCount > 1 ? "s" : ""} sur la boutique et ${selectedCount > 1 ? "leurs variantes seront" : "ses variantes seront"} désactivées. Vous pourrez les restaurer à tout moment.`
								: `${selectedCount > 1 ? "Les bijoux sélectionnés seront remis" : "Le bijou sélectionné sera remis"} en statut public et ${selectedCount > 1 ? "redeviendront visibles" : "redeviendra visible"} sur la boutique.`}
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="button"
							onClick={confirmArchive}
							disabled={isPending}
							aria-busy={isPending || undefined}
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							{archiveTarget === "ARCHIVED" ? "Remiser" : "Réexposer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>

			{/* Status change confirm */}
			<ResponsiveAlertDialog
				open={isStatusDialog}
				onOpenChange={(next) => {
					if (!next && !isPending) setPendingDialog(null);
				}}
				tone={statusTarget === "PUBLIC" ? "success" : "info"}
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon icon={statusTarget === "PUBLIC" ? Upload : Pencil} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{statusTarget === "PUBLIC"
								? `Publier ${selectedCount} bijou${selectedCount > 1 ? "x" : ""} ?`
								: `Repasser ${selectedCount} bijou${selectedCount > 1 ? "x" : ""} en brouillon ?`}
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							{statusTarget === "PUBLIC"
								? "Seuls les bijoux prêts (avec au moins une variante active, du stock et une image principale) seront publiés. Les autres resteront en attente."
								: `${selectedCount > 1 ? "Les bijoux sélectionnés ne seront" : "Le bijou sélectionné ne sera"} plus visible${selectedCount > 1 ? "s" : ""} sur la boutique mais ${selectedCount > 1 ? "leurs variantes resteront" : "ses variantes resteront"} actives.`}
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="button"
							onClick={confirmStatus}
							disabled={isPending}
							aria-busy={isPending || undefined}
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							{statusTarget === "PUBLIC" ? "Publier" : "Repasser en brouillon"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>

			{/* Delete confirm — destructive strict */}
			<ResponsiveAlertDialog
				open={isDeleteDialog}
				onOpenChange={(next) => {
					if (!next && !isPending) setPendingDialog(null);
				}}
				tone="destructive"
			>
				<ResponsiveAlertDialogContent>
					<ResponsiveAlertDialogHeroIcon icon={Trash2} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Supprimer définitivement {selectedCount} bijou{selectedCount > 1 ? "x" : ""} ?
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							Cette action est irréversible. Seuls les brouillons et bijoux archivés peuvent être
							supprimés. Les bijoux associés à des commandes seront conservés pour l'historique.
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="button"
							onClick={confirmDelete}
							disabled={isPending}
							aria-busy={isPending || undefined}
						>
							{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							Supprimer définitivement
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>

			{/* Attach to collection sheet */}
			<BulkAttachCollectionSheet
				open={attachOpen}
				onOpenChange={setAttachOpen}
				productIds={Array.from(selectedIds)}
				collections={collections}
			/>
		</>
	);
}
