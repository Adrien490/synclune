"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDuplicateMaterial } from "@/modules/materials/hooks/use-duplicate-material";
import { useToggleMaterialStatus } from "@/modules/materials/hooks/use-toggle-material-status";
import {
	Copy,
	Edit,
	ExternalLink,
	MoreVertical,
	Power,
	PowerOff,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { MATERIAL_DIALOG_ID } from "./material-form-dialog";
import { DELETE_MATERIAL_DIALOG_ID } from "@/modules/materials/components/admin/delete-material-alert-dialog";

interface MaterialsRowActionsProps {
	materialId: string;
	materialName: string;
	materialSlug: string;
	materialDescription: string | null;
	materialIsActive: boolean;
}

export function MaterialsRowActions({
	materialId,
	materialName,
	materialSlug,
	materialDescription,
	materialIsActive,
}: MaterialsRowActionsProps) {
	const { open: openDialog } = useDialog(MATERIAL_DIALOG_ID);
	const { open: openAlert } = useAlertDialog(DELETE_MATERIAL_DIALOG_ID);
	const { duplicate, isPending: isDuplicating } = useDuplicateMaterial();
	const { toggleStatus, isPending: isToggling } = useToggleMaterialStatus();

	const handleEdit = () => {
		openDialog({
			material: {
				id: materialId,
				name: materialName,
				slug: materialSlug,
				description: materialDescription,
				isActive: materialIsActive,
			},
		});
	};

	const handleDelete = () => {
		openAlert({
			materialId,
			materialName,
		});
	};

	const handleToggle = () => {
		toggleStatus(materialId, !materialIsActive);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={handleEdit}>
					<Edit className="h-4 w-4" />
					Éditer
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => duplicate(materialId, materialName)}
					disabled={isDuplicating}
				>
					<Copy className="h-4 w-4" />
					Dupliquer
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href={`/admin/catalogue/inventaire?materialId=${materialId}`}>
						<ExternalLink className="h-4 w-4" />
						Voir les variantes
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleToggle} disabled={isToggling}>
					{materialIsActive ? (
						<>
							<PowerOff className="h-4 w-4" />
							Désactiver
						</>
					) : (
						<>
							<Power className="h-4 w-4" />
							Activer
						</>
					)}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleDelete} className="text-destructive">
					<Trash2 className="h-4 w-4" />
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
