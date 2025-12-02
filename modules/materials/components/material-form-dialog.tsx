"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { useAppForm } from "@/shared/components/forms";
import { createMaterial } from "@/modules/materials/actions/create-material";
import { updateMaterial } from "@/modules/materials/actions/update-material";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useEffect, useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export const MATERIAL_DIALOG_ID = "material-form";

interface MaterialDialogData extends Record<string, unknown> {
	material?: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		isActive: boolean;
	};
}

export function MaterialFormDialog() {
	const { isOpen, close, data } = useDialog<MaterialDialogData>(MATERIAL_DIALOG_ID);
	const material = data?.material;
	const isUpdateMode = !!material;

	const form = useAppForm({
		defaultValues: {
			name: "",
			description: "",
			isActive: true,
		},
	});

	// Create action
	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createMaterial,
			createToastCallbacks({
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
			updateMaterial,
			createToastCallbacks({
				onSuccess: () => {
					close();
				},
			})
		),
		undefined
	);

	const isPending = isCreatePending || isUpdatePending;
	const action = isUpdateMode ? updateAction : createAction;

	// Reset form values when material data changes
	useEffect(() => {
		if (material) {
			form.reset({
				name: material.name,
				description: material.description || "",
				isActive: material.isActive,
			});
		} else {
			form.reset({
				name: "",
				description: "",
				isActive: true,
			});
		}
	}, [material, form]);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close();
				}
			}}
		>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isUpdateMode ? "Modifier le matériau" : "Créer un matériau"}
					</DialogTitle>
				</DialogHeader>

				<form
					action={action}
					className="space-y-6"
					onSubmit={() => form.handleSubmit()}
				>
					{isUpdateMode && material && (
						<>
							<input type="hidden" name="id" value={material.id} />
							<input type="hidden" name="slug" value={material.slug} />
							<input type="hidden" name="isActive" value={String(material.isActive)} />
						</>
					)}

					<RequiredFieldsNote />

					<div className="space-y-4">
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
									placeholder="ex: Argent 925, Or 18 carats, Acier inoxydable"
									disabled={isPending}
									required
								/>
							)}
						</form.AppField>

						<form.AppField
							name="description"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (value && value.length > 1000) {
										return "La description ne peut pas dépasser 1000 caractères";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<field.TextareaField
									label="Description"
									placeholder="Description du matériau (optionnel)"
									disabled={isPending}
									rows={3}
								/>
							)}
						</form.AppField>
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
