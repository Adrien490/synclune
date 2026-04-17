"use client";

import { Copy, ExternalLink, Power, PowerOff, SquarePen, Trash2 } from "lucide-react";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { useDuplicateMaterial } from "@/modules/materials/hooks/use-duplicate-material";
import { useToggleMaterialStatus } from "@/modules/materials/hooks/use-toggle-material-status";
import { MATERIAL_DIALOG_ID } from "@/modules/materials/components/material-form-dialog";
import { DELETE_MATERIAL_DIALOG_ID } from "@/modules/materials/components/admin/delete-material-alert-dialog";

export const MATERIAL_ITEM_DRAWER_ID = "material-item-drawer";

export interface MaterialItemDrawerData {
	material: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		isActive: boolean;
		skuCount: number;
	};
	[key: string]: unknown;
}

export function MaterialItemDrawer() {
	const drawer = useDialog<MaterialItemDrawerData>(MATERIAL_ITEM_DRAWER_ID);
	const formDialog = useDialog(MATERIAL_DIALOG_ID);
	const deleteAlert = useAlertDialog(DELETE_MATERIAL_DIALOG_ID);
	const { duplicate, isPending: isDuplicating } = useDuplicateMaterial();
	const { toggleStatus, isPending: isToggling } = useToggleMaterialStatus();

	const material = drawer.data?.material;

	if (!material) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const { id, name, slug, description, isActive, skuCount } = material;
	const skuLabel = `${skuCount} variante${skuCount !== 1 ? "s" : ""}`;
	const statusLabel = isActive ? "Actif" : "Inactif";

	const handleEdit = () => {
		drawer.close();
		formDialog.open({ material: { id, name, slug, description, isActive } });
	};

	const handleDuplicate = () => {
		duplicate(id);
		drawer.close();
	};

	const handleToggle = () => {
		toggleStatus(id, !isActive);
		drawer.close();
	};

	const handleDelete = () => {
		drawer.close();
		deleteAlert.open({ materialId: id, materialName: name });
	};

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={name}
			description={`${skuLabel} · ${statusLabel}`}
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
					<Badge variant={isActive ? "default" : "secondary"}>{statusLabel}</Badge>
				</dd>
				<dt className="text-muted-foreground">Variantes</dt>
				<dd>{skuCount}</dd>
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleEdit}
				>
					<SquarePen className="size-4" aria-hidden="true" />
					Éditer
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleDuplicate}
					disabled={isDuplicating}
				>
					<Copy className="size-4" aria-hidden="true" />
					Dupliquer
				</Button>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link
						href={`/admin/catalogue/inventaire?materialId=${id}`}
						onClick={() => drawer.close()}
					>
						<ExternalLink className="size-4" aria-hidden="true" />
						Voir les variantes
					</Link>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleToggle}
					disabled={isToggling}
				>
					{isActive ? (
						<>
							<PowerOff className="size-4" aria-hidden="true" />
							Désactiver
						</>
					) : (
						<>
							<Power className="size-4" aria-hidden="true" />
							Activer
						</>
					)}
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
			</div>
		</AdminItemDrawer>
	);
}
