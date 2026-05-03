"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { CreateColorForm } from "@/modules/colors/components/admin/create-color-form";
import {
	EditColorForm,
	type EditableColor,
} from "@/modules/colors/components/admin/edit-color-form";

export const COLOR_DIALOG_ID = "color-form";

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
							? "Modifiez le nom ou le code couleur"
							: "Ajoutez une nouvelle couleur au catalogue"}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{isUpdateMode ? (
					<EditColorForm color={color!} onSuccess={close} redirectOnSuccess={false} />
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
