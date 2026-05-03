"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { createMaterial } from "@/modules/materials/actions/create-material";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

interface CreateMaterialFormProps {
	onSuccess?: () => void;
	onCreated?: (id: string) => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

export function CreateMaterialForm({
	onSuccess,
	onCreated,
	redirectOnSuccess = true,
	className,
}: CreateMaterialFormProps = {}) {
	const router = useRouter();
	const haptic = useHaptic();

	const form = useAppForm({
		defaultValues: {
			name: "",
			description: "",
		},
	});

	const [, action, isPending] = useActionState(
		withCallbacks(
			createMaterial,
			createToastCallbacks({
				loadingMessage: "Création du matériau...",
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
						onCreated?.(result.data.id);
					}
					haptic("success");
					form.reset();
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
							{isPending ? "Enregistrement..." : "Créer"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
