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

import { CreateColorForm } from "@/modules/colors/components/admin/create-color-form";
import {
	EditColorForm,
	type EditableColor,
} from "@/modules/colors/components/admin/edit-color-form";

// Re-dérivé du registre : ouvreurs et dialog s'abonnent au même identifiant.
export const COLOR_DIALOG_ID = TAXONOMY_CONFIG.color.formDialogId;

interface ColorDialogData extends Record<string, unknown> {
	color?: EditableColor;
	onCreated?: (id: string) => void;
}

export function ColorFormDialog() {
	const { isOpen, close, data } = useDialog<ColorDialogData>(COLOR_DIALOG_ID);
	const color = data?.color;
	const isUpdateMode = !!color;

	return (
		<ResponsiveDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) close();
			}}
		>
			<ResponsiveDialogContent className="max-w-2xl">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier la couleur" : "Créer une couleur"}
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{isUpdateMode
							? "Modifiez les informations de la couleur"
							: "Ajoutez une nouvelle couleur au catalogue"}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{isUpdateMode ? (
					<EditColorForm
						key={color!.id}
						color={color!}
						onSuccess={close}
						redirectOnSuccess={false}
					/>
				) : (
					<CreateColorForm
						onSuccess={close}
						onCreated={data?.onCreated}
						redirectOnSuccess={false}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
