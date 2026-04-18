"use client";

import { Button } from "@/shared/components/ui/button";
import { SimpleColorPicker } from "@/modules/colors/components/color-picker";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Label } from "@/shared/components/ui/label";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useAppForm } from "@/shared/components/forms";
import { createColor } from "@/modules/colors/actions/create-color";
import { updateColor } from "@/modules/colors/actions/update-color";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useEffect, useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export const COLOR_DIALOG_ID = "color-form";

interface ColorDialogData extends Record<string, unknown> {
	color?: {
		id: string;
		name: string;
		slug: string;
		hex: string;
	};
	onCreated?: (id: string) => void;
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

	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createColor,
			createToastCallbacks({
				loadingMessage: "Création de la couleur...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"data" in result &&
						result.data &&
						typeof result.data === "object" &&
						"id" in result.data &&
						typeof result.data.id === "string"
					) {
						data?.onCreated?.(result.data.id);
					}
					close();
					form.reset();
				},
			}),
		),
		undefined,
	);

	const [, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateColor,
			createToastCallbacks({
				loadingMessage: "Mise à jour de la couleur...",
				onSuccess: () => {
					close();
				},
			}),
		),
		undefined,
	);

	const isPending = isCreatePending || isUpdatePending;
	const action = isUpdateMode ? updateAction : createAction;

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
		<ResponsiveDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close();
				}
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

				<form action={action} className="space-y-6" onSubmit={() => form.handleSubmit()}>
					{isUpdateMode && <input type="hidden" name="id" value={color!.id} />}

					<RequiredFieldsNote />

					<div className="space-y-6">
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
									<SimpleColorPicker
										value={field.state.value}
										onChange={(hex) => field.handleChange(hex)}
										disabled={isPending}
									/>
									<input type="hidden" name="hex" value={field.state.value} />
								</div>
							)}
						</form.AppField>

						<form.AppField
							name="name"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value || value.length < 1) {
										return "Le nom est requis";
									}
									if (value.length > 100) {
										return "Le nom ne peut pas dépasser 100 caractères";
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

					<div className="flex justify-end pt-4">
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button disabled={!canSubmit || isPending} type="submit">
									{isPending ? "Enregistrement..." : isUpdateMode ? "Enregistrer" : "Créer"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
