"use client";

import { Archive, ArchiveRestore, ChevronRight, Eye, Package, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { CollectionStatus } from "@/app/generated/prisma/enums";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { useHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";

import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";

import { ARCHIVE_COLLECTION_DIALOG_ID } from "./archive-collection-alert-dialog";
import { CHANGE_COLLECTION_STATUS_DIALOG_ID } from "./change-collection-status-alert-dialog";
import { COLLECTION_DIALOG_ID } from "./collection-form-dialog";
import { DELETE_COLLECTION_DIALOG_ID } from "./delete-collection-alert-dialog";

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

const STATUS_CONFIG: Record<
	CollectionStatus,
	{ variant: "default" | "secondary" | "outline"; dotClass: string }
> = {
	[CollectionStatus.PUBLIC]: { variant: "default", dotClass: "bg-emerald-500" },
	[CollectionStatus.DRAFT]: { variant: "secondary", dotClass: "bg-amber-500" },
	[CollectionStatus.ARCHIVED]: { variant: "outline", dotClass: "bg-muted-foreground" },
};

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
	<h3 className="text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase">
		{children}
	</h3>
);

export function CollectionItemDrawer() {
	const drawer = useDialog<CollectionItemDrawerData>(COLLECTION_ITEM_DRAWER_ID);
	const formDialog = useDialog(COLLECTION_DIALOG_ID);
	const deleteAlert = useAlertDialog(DELETE_COLLECTION_DIALOG_ID);
	const archiveAlert = useAlertDialog(ARCHIVE_COLLECTION_DIALOG_ID);
	const changeStatusAlert = useAlertDialog(CHANGE_COLLECTION_STATUS_DIALOG_ID);
	const haptic = useHaptic();

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
	const statusConfig = STATUS_CONFIG[status];
	const isArchived = status === CollectionStatus.ARCHIVED;

	const withHaptic = (tier: HapticPattern, fn: () => void) => () => {
		haptic(tier);
		fn();
	};

	const handleEdit = withHaptic("light", () => {
		drawer.close();
		formDialog.open({
			collection: { id, name, slug, description, status },
		});
	});

	const handleChangeStatus = (targetStatus: CollectionStatus) =>
		withHaptic("light", () => {
			drawer.close();
			changeStatusAlert.open({
				collectionId: id,
				collectionName: name,
				currentStatus: status,
				targetStatus,
			});
		});

	const handleArchive = withHaptic("medium", () => {
		drawer.close();
		archiveAlert.open({ collectionId: id, collectionName: name, collectionStatus: status });
	});

	const handleDelete = withHaptic("heavy", () => {
		drawer.close();
		deleteAlert.open({ collectionId: id, collectionName: name, productsCount });
	});

	const handleNavigate = () => {
		haptic("selection");
		drawer.close();
	};

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={name}
			description={`${productsCount} produit${productsCount !== 1 ? "s" : ""} · ${statusLabel}`}
		>
			{/* Hero header : icône + compteur produits + badge statut */}
			<div className="flex items-start gap-4">
				<div
					className="bg-muted border-border flex size-16 shrink-0 items-center justify-center rounded-xl border"
					aria-hidden="true"
				>
					<Package className="text-muted-foreground size-7" />
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="text-2xl font-semibold tracking-tight">
						{productsCount} produit{productsCount !== 1 ? "s" : ""}
					</div>
					<div className="flex flex-wrap items-center gap-1.5">
						<Badge variant={statusConfig.variant} className="gap-1.5">
							<span
								className={cn("size-1.5 rounded-full", statusConfig.dotClass)}
								aria-hidden="true"
							/>
							{statusLabel}
						</Badge>
					</div>
				</div>
			</div>

			{/* Métadonnées */}
			<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Slug</dt>
				<dd className="truncate font-mono text-xs">{slug}</dd>
				{description ? (
					<>
						<dt className="text-muted-foreground">Description</dt>
						<dd className="text-pretty">{description}</dd>
					</>
				) : null}
			</dl>

			<Separator />

			{/* Section Gérer */}
			<div className="flex flex-col gap-2">
				<SectionHeading>Gérer</SectionHeading>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link
						href={`/collections/${slug}`}
						target="_blank"
						rel="noopener noreferrer"
						onClick={handleNavigate}
					>
						<Eye className="size-4 shrink-0" aria-hidden="true" />
						<span>Voir sur la boutique</span>
						<ChevronRight
							className="text-muted-foreground ml-auto size-4 shrink-0"
							aria-hidden="true"
						/>
					</Link>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleEdit}
				>
					<Pencil className="size-4 shrink-0" aria-hidden="true" />
					<span>Modifier</span>
				</Button>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link href={`/admin/catalogue/collections/${slug}`} onClick={handleNavigate}>
						<Package className="size-4 shrink-0" aria-hidden="true" />
						<span>Gérer les produits</span>
						<ChevronRight
							className="text-muted-foreground ml-auto size-4 shrink-0"
							aria-hidden="true"
						/>
					</Link>
				</Button>
			</div>

			{/* Section Statut (non archivé) */}
			{!isArchived && (
				<>
					<Separator />
					<div className="flex flex-col gap-2">
						<SectionHeading>Statut</SectionHeading>
						{status !== CollectionStatus.DRAFT && (
							<Button
								variant="outline"
								size="lg"
								className="h-12 justify-start gap-3"
								onClick={handleChangeStatus(CollectionStatus.DRAFT)}
							>
								<Pencil className="size-4 shrink-0" aria-hidden="true" />
								<span>Passer en brouillon</span>
							</Button>
						)}
						{status !== CollectionStatus.PUBLIC && (
							<Button
								variant="outline"
								size="lg"
								className="h-12 justify-start gap-3"
								onClick={handleChangeStatus(CollectionStatus.PUBLIC)}
							>
								<Eye className="size-4 shrink-0" aria-hidden="true" />
								<span>Passer en public</span>
							</Button>
						)}
						<Button
							variant="outline"
							size="lg"
							className="h-12 justify-start gap-3"
							onClick={handleArchive}
						>
							<Archive className="size-4 shrink-0" aria-hidden="true" />
							<span>Archiver</span>
						</Button>
					</div>
				</>
			)}

			{/* Section Archive (archivé) */}
			{isArchived && (
				<>
					<Separator />
					<div className="flex flex-col gap-2">
						<SectionHeading>Archive</SectionHeading>
						<Button
							variant="outline"
							size="lg"
							className="h-12 justify-start gap-3"
							onClick={handleArchive}
						>
							<ArchiveRestore className="size-4 shrink-0" aria-hidden="true" />
							<span>Restaurer</span>
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/30 h-12 justify-start gap-3"
							onClick={handleDelete}
						>
							<Trash2 className="size-4 shrink-0" aria-hidden="true" />
							<span>Supprimer définitivement</span>
						</Button>
					</div>
				</>
			)}
		</AdminItemDrawer>
	);
}
