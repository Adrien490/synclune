"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { updateMaterial } from "@/modules/materials/actions/update-material";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

export interface EditableMaterial {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	isActive: boolean;
}

interface EditMaterialFormProps {
	material: EditableMaterial;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

export function EditMaterialForm({
	material,
	onSuccess,
	redirectOnSuccess = true,
	className,
}: EditMaterialFormProps) {
	const router = useRouter();
	const haptic = useHaptic();

	const form = useAppForm({
		defaultValues: {
			name: material.name,
			description: material.description ?? "",
		},
	});

	const [, action, isPending] = useActionState(
		withCallbacks(
			updateMaterial,
			createToastCallbacks({
				loadingMessage: "Mise à jour du matériau...",
				onSuccess: () => {
					haptic("success");
					onSuccess?.();
					if (redirectOnSuccess) {
						setTimeout(
							() => router.push("/admin/catalogue/materiaux"),
							FORM_SUCCESS_REDIRECT_DELAY_MS,
						);
					}
				},
			}),
		),
		undefined,
	);

	return (
		<form
			action={action}
			className={cn("space-y-6", className)}
			onSubmit={() => form.handleSubmit()}
		>
			<input type="hidden" name="id" value={material.id} />
			<input type="hidden" name="isActive" value={String(material.isActive)} />

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

			<div className="flex justify-end pt-4">
				<form.Subscribe selector={(state) => [state.canSubmit]}>
					{([canSubmit]) => (
						<Button disabled={!canSubmit || isPending} type="submit">
							{isPending ? "Enregistrement..." : "Enregistrer"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
