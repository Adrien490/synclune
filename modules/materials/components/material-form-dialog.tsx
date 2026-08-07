"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useDialog } from "@/shared/providers/overlay-store-provider";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";

import { CreateMaterialForm } from "@/modules/materials/components/admin/create-material-form";
import {
	EditMaterialForm,
	type EditableMaterial,
} from "@/modules/materials/components/admin/edit-material-form";

// Re-dérivé du registre : ouvreurs et dialog s'abonnent au même identifiant.
export const MATERIAL_DIALOG_ID = TAXONOMY_CONFIG.material.formDialogId;

interface MaterialDialogData extends Record<string, unknown> {
	material?: EditableMaterial;
	onCreated?: (id: string) => void;
}

export function MaterialFormDialog() {
	const { isOpen, close, data } = useDialog<MaterialDialogData>(MATERIAL_DIALOG_ID);
	const material = data?.material;
	const isUpdateMode = !!material;

	return (
		<ResponsiveDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) close();
			}}
		>
			<ResponsiveDialogContent className="max-w-lg">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier le matériau" : "Créer un matériau"}
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{isUpdateMode
							? "Modifiez les informations du matériau"
							: "Ajoutez un nouveau matériau au catalogue"}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{isUpdateMode ? (
					<EditMaterialForm material={material!} onSuccess={close} redirectOnSuccess={false} />
				) : (
					<CreateMaterialForm
						onSuccess={close}
						onCreated={data?.onCreated}
						redirectOnSuccess={false}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
