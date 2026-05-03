"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { updateColor } from "@/modules/colors/actions/update-color";
import { ColorPalette } from "@/modules/colors/components/color-palette";
import { HexColorInput } from "@/modules/colors/components/hex-color-input";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

export interface EditableColor {
	id: string;
	name: string;
	slug: string;
	hex: string;
}

interface EditColorFormProps {
	color: EditableColor;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

export function EditColorForm({
	color,
	onSuccess,
	redirectOnSuccess = true,
	className,
}: EditColorFormProps) {
	const router = useRouter();
	const haptic = useHaptic();

	const form = useAppForm({
		defaultValues: {
			name: color.name,
			hex: color.hex,
		},
	});

	const [, action, isPending] = useActionState(
		withCallbacks(
			updateColor,
			createToastCallbacks({
				loadingMessage: "Mise à jour de la couleur...",
				onSuccess: () => {
					haptic("success");
					onSuccess?.();
					if (redirectOnSuccess) {
						setTimeout(
							() => router.push("/admin/catalogue/couleurs"),
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
			<input type="hidden" name="id" value={color.id} />

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
						<div className="space-y-4">
							<Label>
								Couleur
								<span className="text-destructive ml-1">*</span>
							</Label>
							<ColorPalette
								value={field.state.value}
								onChange={(hex) => field.handleChange(hex)}
								disabled={isPending}
							/>
							<HexColorInput
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
							{isPending ? "Enregistrement..." : "Enregistrer"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
