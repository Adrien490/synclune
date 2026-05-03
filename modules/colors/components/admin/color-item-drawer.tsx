"use client";

import { Copy, ExternalLink, SquarePen, Trash2 } from "lucide-react";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { useDuplicateColor } from "@/modules/colors/hooks/use-duplicate-color";
import {
	DeleteColorAlertDialog,
	DELETE_COLOR_DIALOG_ID,
} from "@/modules/colors/components/admin/delete-color-alert-dialog";

export const COLOR_ITEM_DRAWER_ID = "color-item-drawer";

const COLOR_DIALOGS = (
	<>
		<DeleteColorAlertDialog />
	</>
);

export interface ColorItemDrawerData {
	color: {
		id: string;
		name: string;
		hex: string;
		slug: string;
		isActive: boolean;
		skuCount: number;
	};
	[key: string]: unknown;
}

export function ColorItemDrawer() {
	const drawer = useDialog<ColorItemDrawerData>(COLOR_ITEM_DRAWER_ID);
	const deleteAlert = useAlertDialog(DELETE_COLOR_DIALOG_ID);
	const { duplicate, isPending: isDuplicating } = useDuplicateColor();

	const color = drawer.data?.color;

	if (!color) {
		return (
			<AdminItemDrawer
				open={drawer.isOpen}
				onOpenChange={(o) => !o && drawer.close()}
				title=""
				dialogs={COLOR_DIALOGS}
			>
				{null}
			</AdminItemDrawer>
		);
	}

	const { id, name, hex, slug, isActive, skuCount } = color;
	const skuLabel = `${skuCount} variante${skuCount !== 1 ? "s" : ""}`;
	const statusLabel = isActive ? "Actif" : "Inactif";

	const handleDuplicate = () => {
		duplicate(id);
		drawer.close();
	};

	const handleDelete = () => {
		deleteAlert.open({ colorId: id, colorName: name });
	};

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={name}
			description={`${skuLabel} · ${statusLabel}`}
			dialogs={COLOR_DIALOGS}
		>
			<dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Aperçu</dt>
				<dd className="flex items-center gap-2">
					<span
						className="border-border inline-block size-6 rounded-full border"
						style={{ backgroundColor: hex }}
						aria-hidden="true"
					/>
					<code className="font-mono text-xs">{hex}</code>
				</dd>
				<dt className="text-muted-foreground">Slug</dt>
				<dd className="truncate font-mono text-xs">{slug}</dd>
				<dt className="text-muted-foreground">Statut</dt>
				<dd>
					<Badge variant={isActive ? "default" : "secondary"}>{statusLabel}</Badge>
				</dd>
				<dt className="text-muted-foreground">Variantes</dt>
				<dd>{skuCount}</dd>
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link href={`/admin/catalogue/couleurs/${slug}/modifier`} onClick={() => drawer.close()}>
						<SquarePen className="size-4" aria-hidden="true" />
						Éditer
					</Link>
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
					<Link href={`/admin/catalogue/inventaire?colorId=${id}`} onClick={() => drawer.close()}>
						<ExternalLink className="size-4" aria-hidden="true" />
						Voir les variantes
					</Link>
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
