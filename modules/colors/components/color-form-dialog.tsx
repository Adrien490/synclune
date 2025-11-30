"use client";

import { Button } from "@/shared/components/ui/button";
import {
	ColorPicker,
	ColorPickerAlpha,
	ColorPickerFormat,
	ColorPickerHue,
	ColorPickerOutput,
	ColorPickerSelection,
} from "@/shared/components/ui/color-picker";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { useAppForm } from "@/shared/components/forms";
import { createColor } from "@/modules/colors/actions/create-color";
import { updateColor } from "@/modules/colors/actions/update-color";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useEffect, useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import Color from "color";

export const COLOR_DIALOG_ID = "color-form";

interface ColorDialogData extends Record<string, unknown> {
	color?: {
		id: string;
		name: string;
		slug: string;
		hex: string;
	};
}

export function ColorFormDialog() {
	const { isOpen, close, data } = useDialog<ColorDialogData>(COLOR_DIALOG_ID);
	const color = data?.color;
	const isUpdateMode = !!color;

	const form = useAppForm({
		defaultValues: {
			name: "",
			hex: "#000000",
		},
	});

	// Create action
	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createColor,
			createToastCallbacks({
				loadingMessage: "Création de la couleur...",
				onSuccess: () => {
					close();
					form.reset();
				},
			})
		),
		undefined
	);

	// Update action
	const [, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateColor,
			createToastCallbacks({
				loadingMessage: "Modification de la couleur...",
				onSuccess: () => {
					close();
				},
			})
		),
		undefined
	);

	const isPending = isCreatePending || isUpdatePending;
	const action = isUpdateMode ? updateAction : createAction;

	// Reset form values when color data changes
	useEffect(() => {
		if (color) {
			form.reset({
				name: color.name,
				hex: color.hex,
			});
		} else {
			form.reset({
				name: "",
				hex: "#000000",
			});
		}
	}, [color, form]);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close();
				}
			}}
		>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isUpdateMode ? "Modifier la couleur" : "Créer une couleur"}
					</DialogTitle>
				</DialogHeader>

				<form
					action={action}
					className="space-y-6"
					onSubmit={() => form.handleSubmit()}
				>
					{isUpdateMode && color && (
						<input type="hidden" name="id" value={color.id} />
					)}

					<RequiredFieldsNote />

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Gauche : ColorPicker */}
						<form.AppField
							name="hex"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value || value.length < 1) {
										return "Le code couleur est requis";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<Label>
										Couleur
										<span className="text-destructive ml-1">*</span>
									</Label>
									<ColorPicker
										value={field.state.value}
										onChange={(rgba) => {
											const colorObj = Color.rgb(rgba);
											const hex = colorObj.hex();
											field.handleChange(hex);
										}}
										className="w-full"
									>
										<div className="space-y-4">
											<div className="h-48 w-full">
												<ColorPickerSelection className="h-full w-full" />
											</div>
											<ColorPickerHue className="w-full" />
											<ColorPickerAlpha className="w-full" />
											<div className="flex gap-2">
												<ColorPickerFormat className="flex-1" />
												<ColorPickerOutput />
											</div>
										</div>
									</ColorPicker>
									<input type="hidden" name="hex" value={field.state.value} />
								</div>
							)}
						</form.AppField>

						{/* Droite : Champs */}
						<div className="space-y-4">
							<form.AppField
								name="name"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value || value.length < 1) {
											return "Le nom est requis";
										}
										if (value.length > 50) {
											return "Le nom ne peut pas dépasser 50 caractères";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.InputField
										label="Nom"
										type="text"
										placeholder="ex: Rouge, Bleu Marine"
										disabled={isPending}
										required
									/>
								)}
							</form.AppField>
						</div>
					</div>

					{/* Submit button */}
					<div className="flex justify-end pt-4">
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button disabled={!canSubmit || isPending} type="submit">
									{isPending
										? "Enregistrement..."
										: isUpdateMode
											? "Enregistrer"
											: "Créer"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
