"use client";

import {
	Copy,
	EllipsisVertical,
	ExternalLink,
	Power,
	PowerOff,
	SquarePen,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { DELETE_MATERIAL_DIALOG_ID } from "@/modules/materials/components/admin/delete-material-alert-dialog";
import { useDuplicateMaterial } from "@/modules/materials/hooks/use-duplicate-material";
import { useToggleMaterialStatus } from "@/modules/materials/hooks/use-toggle-material-status";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { MATERIAL_DIALOG_ID } from "./material-form-dialog";

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
	const isMobile = useIsMobile();
	const router = useRouter();

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "edit",
					label: "Éditer",
					icon: SquarePen,
					onSelect: () => {
						if (isMobile) {
							router.push(`/admin/catalogue/materiaux/${materialSlug}/modifier`);
						} else {
							openDialog({
								material: {
									id: materialId,
									name: materialName,
									slug: materialSlug,
									description: materialDescription,
									isActive: materialIsActive,
								},
							});
						}
					},
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: Copy,
					disabled: isDuplicating,
					onSelect: () => duplicate(materialId),
				},
				{
					key: "variants",
					label: "Voir les variantes",
					icon: ExternalLink,
					href: `/admin/catalogue/inventaire?materialId=${materialId}`,
				},
				{
					key: "toggle",
					label: materialIsActive ? "Désactiver" : "Activer",
					icon: materialIsActive ? PowerOff : Power,
					disabled: isToggling,
					onSelect: () => toggleStatus(materialId, !materialIsActive),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					icon: Trash2,
					variant: "destructive",
					onSelect: () => openAlert({ materialId, materialName }),
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
					className="h-11 w-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
					aria-label={`Actions pour ${materialName}`}
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent title="Actions" description={materialName} sections={sections} />
		</ResponsiveActionMenu>
	);
}
