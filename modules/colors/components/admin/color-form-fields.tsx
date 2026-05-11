"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Field, FieldError } from "@/shared/components/ui/field";

import { HexColorInput } from "../hex-color-input";
import type { ColorFormInstance } from "../../hooks/use-color-form";
import { colorNameSchema, hexColorSchema } from "../../schemas/color.schemas";

const validateHex = (value: string): string | undefined => {
	const result = hexColorSchema.safeParse(value);
	return result.success ? undefined : (result.error.issues[0]?.message ?? "Code couleur invalide");
};

const validateName = (value: string): string | undefined => {
	const result = colorNameSchema.safeParse(value);
	return result.success ? undefined : (result.error.issues[0]?.message ?? "Nom invalide");
};

interface ColorFormFieldsProps {
	form: ColorFormInstance;
	isPending: boolean;
}

/**
 * Champs partagés entre create-color-form et edit-color-form.
 * Le validator du champ `hex` délègue à `hexColorSchema` côté serveur (parité
 * client/serveur, accepte `#RGB` ou `#RRGGBB`).
 */
export function ColorFormFields({ form, isPending }: ColorFormFieldsProps) {
	return (
		<div className="space-y-6">
			<form.AppField name="hex" validators={{ onChange: ({ value }) => validateHex(value) }}>
				{(field) => {
					const errorId = `${field.name}-error`;
					const hasError = field.state.meta.errors.length > 0;
					return (
						<Field data-invalid={hasError}>
							<FieldLabel htmlFor={field.name} required>
								Couleur
							</FieldLabel>
							<HexColorInput
								id={field.name}
								name={field.name}
								value={field.state.value}
								onChange={(hex) => field.handleChange(hex)}
								disabled={isPending}
								aria-invalid={hasError}
								aria-describedby={hasError ? errorId : `${field.name}-help`}
							/>
							<FieldError id={errorId} errors={field.state.meta.errors} />
						</Field>
					);
				}}
			</form.AppField>

			<form.AppField name="name" validators={{ onChange: ({ value }) => validateName(value) }}>
				{(field) => (
					<field.InputField
						label="Nom"
						type="text"
						placeholder="ex: Rouge, Bleu Marine"
						disabled={isPending}
						required
						autoCapitalize="words"
						enterKeyHint="done"
					/>
				)}
			</form.AppField>
		</div>
	);
}
