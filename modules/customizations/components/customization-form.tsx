"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { ResponsiveSelect, type ResponsiveSelectOption } from "@/shared/components/responsive-select";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { toast } from "sonner";

import { useCustomizationForm } from "../hooks/use-customization-form";
import type { ProductType } from "../types/customization.types";

interface CustomizationFormProps {
	productTypes: ProductType[];
	onSuccess?: () => void;
}

export function CustomizationForm({
	productTypes,
	onSuccess,
}: CustomizationFormProps) {
	const { form, action, isPending } = useCustomizationForm({
		onSuccess: () => {
			form.reset();
			onSuccess?.();
			toast.success("Message envoyé !", {
				description: "Je te réponds sous 24-48h avec un devis personnalisé",
				duration: 8000,
			});
		},
	});

	// Avertir l'utilisateur des changements non sauvegardés
	useUnsavedChanges(form.state.isDirty && !isPending);

	return (
		<form
			action={action}
			className="space-y-6"
			onSubmit={() => void form.handleSubmit()}
		>
			{/* Champ honeypot caché (anti-spam) */}
			<input
				type="text"
				name="website"
				className="hidden"
				aria-hidden="true"
				tabIndex={-1}
			/>

			{/* Champ caché pour productTypeLabel */}
			<form.Subscribe
				selector={(state) => state.values.productTypeLabel}
			>
				{(productTypeLabel) => (
					<>
						{productTypeLabel && (
							<input type="hidden" name="productTypeLabel" value={productTypeLabel} />
						)}
					</>
				)}
			</form.Subscribe>

			<form.AppForm>
				<form.FormErrorDisplay />
			</form.AppForm>

			<RequiredFieldsNote />

			{/* Type de bijou (optionnel) */}
			<form.AppField name="productTypeLabel">
				{(field) => {
					const options: ResponsiveSelectOption[] = [
						...productTypes.map((type) => ({
							value: type.label,
							label: type.label,
						})),
						{ value: "Autre", label: "Autre" },
					];

					return (
						<div className="space-y-2">
							<FieldLabel optional>Type de bijou</FieldLabel>
							<ResponsiveSelect
								options={options}
								value={field.state.value || ""}
								onValueChange={(value) => field.handleChange(value)}
								placeholder="Sélectionner un type de bijou"
								className="w-full"
							/>
							{field.state.meta.errors && field.state.meta.errors.length > 0 && (
								<p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
							)}
						</div>
					);
				}}
			</form.AppField>

			{/* Description du projet */}
			<form.AppField
				name="details"
				validators={{
					onChange: ({ value }: { value: string }) => {
						if (!value || value.trim().length < 20) {
							return "Les détails doivent contenir au moins 20 caractères";
						}
					},
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<field.TextareaField
							label="Décris ton projet"
							required
							rows={4}
							placeholder="Décris ton idée de bijou... Par exemple : Je cherche un bracelet pour un anniversaire de mariage, dans des tons dorés avec des perles..."
						/>
						<p className="text-sm text-muted-foreground text-right">
							{field.state.value?.length || 0} / 2000 caractères
						</p>
					</div>
				)}
			</form.AppField>

			{/* Nom et prénom */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<form.AppField
					name="firstName"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value || value.trim().length < 2) {
								return "Le prénom doit contenir au moins 2 caractères";
							}
						},
					}}
				>
					{(field) => (
					<field.InputField
						label="Prénom"
						required
						autoComplete="given-name"
						autoCapitalize="words"
						autoCorrect="off"
					/>
				)}
				</form.AppField>

				<form.AppField
					name="lastName"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value || value.trim().length < 2) {
								return "Le nom doit contenir au moins 2 caractères";
							}
						},
					}}
				>
					{(field) => (
					<field.InputField
						label="Nom"
						required
						autoComplete="family-name"
						autoCapitalize="words"
						autoCorrect="off"
					/>
				)}
				</form.AppField>
			</div>

			{/* Email */}
			<form.AppField
				name="email"
				validators={{
					onChange: ({ value }: { value: string }) => {
						if (!value) {
							return "L'adresse email est requise";
						}
						if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
							return "Entre une adresse email valide";
						}
					},
				}}
			>
				{(field) => (
				<field.InputField
					label="Adresse email"
					type="email"
					required
					inputMode="email"
					autoComplete="email"
					spellCheck={false}
					autoCorrect="off"
				/>
			)}
			</form.AppField>

			{/* Téléphone */}
			<form.AppField name="phone">
				{(field) => (
					<field.PhoneField
						label="Téléphone"
						optional
						defaultCountry="FR"
						placeholder="06 12 34 56 78"
					/>
				)}
			</form.AppField>

			{/* Consentement RGPD */}
			<form.AppField
				name="rgpdConsent"
				validators={{
					onChange: ({ value }: { value: boolean }) => {
						if (!value) {
							return "Tu dois accepter la politique de confidentialité pour continuer";
						}
					},
				}}
			>
				{(field) => (
					<div className="space-y-1">
						<field.CheckboxField
							label="J'accepte la politique de confidentialité"
							required
						/>
						<p className="text-sm leading-relaxed text-muted-foreground ml-7">
							Consulte notre{" "}
							<a
								href="/confidentialite"
								className="text-foreground underline hover:no-underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								Politique de confidentialité
								<span className="sr-only"> (ouvre dans un nouvel onglet)</span>
							</a>
						</p>
					</div>
				)}
			</form.AppField>

			{/* Submit sticky sur mobile */}
			<div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 py-4 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:py-4 sm:mx-0 sm:px-0 flex justify-center sm:justify-start">
				<form.Subscribe selector={(state) => [state.canSubmit]}>
					{([canSubmit]) => (
						<Button
							type="submit"
							disabled={!canSubmit || isPending}
							size="lg"
							className="w-full sm:w-auto sm:min-w-[220px] relative overflow-hidden group"
						>
							{isPending ? (
								"Envoi en cours..."
							) : (
								<>
									Envoyer mon message
									<span className="absolute inset-0 bg-linear-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								</>
							)}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
