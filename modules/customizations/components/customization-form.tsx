"use client";

import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import {
	ResponsiveSelect,
	type ResponsiveSelectOption,
} from "@/modules/customizations/components/responsive-select";
import { FieldLabel } from "@/shared/components/forms";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { toast } from "sonner";

import { InspirationMediaUpload } from "./inspiration-media-upload";
import { useCustomizationForm } from "../hooks/use-customization-form";
import type { ProductType } from "../types/customization.types";

interface CustomizationFormProps {
	productTypes: ProductType[];
	userInfo?: { firstName: string; email: string };
	onSuccess?: () => void;
}

export function CustomizationForm({ productTypes, userInfo, onSuccess }: CustomizationFormProps) {
	const { form, action, isPending } = useCustomizationForm({
		userInfo,
		onSuccess: () => {
			form.reset();
			onSuccess?.();
			toast.success("Message envoyé !", {
				description: "Je vous réponds prochainement",
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
			data-pending={isPending ? "" : undefined}
			aria-busy={isPending}
			onSubmit={() => void form.handleSubmit()}
		>
			{/* Champ honeypot caché (anti-spam) */}
			<input
				type="text"
				name="website"
				aria-hidden="true"
				tabIndex={-1}
				autoComplete="off"
				style={{
					position: "absolute",
					left: "-9999px",
					opacity: 0,
					pointerEvents: "none",
				}}
			/>

			{/* Champ caché pour productTypeLabel */}
			<form.Subscribe selector={(state) => state.values.productTypeLabel}>
				{(productTypeLabel) => (
					<>
						{productTypeLabel && (
							<input type="hidden" name="productTypeLabel" value={productTypeLabel} />
						)}
					</>
				)}
			</form.Subscribe>

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
					const hasError = field.state.meta.errors.length > 0;

					return (
						<div className="space-y-2">
							<FieldLabel htmlFor="productTypeLabel" optional>
								Type de bijou
							</FieldLabel>
							<ResponsiveSelect
								id="productTypeLabel"
								options={options}
								value={field.state.value || ""}
								onValueChange={(value) => field.handleChange(value)}
								placeholder="Sélectionner un type de bijou"
								className="w-full"
								aria-invalid={hasError}
								aria-describedby={hasError ? "productTypeLabel-error" : undefined}
							/>
							{hasError && (
								<p
									id="productTypeLabel-error"
									role="alert"
									aria-live="polite"
									className="text-destructive text-sm"
								>
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					);
				}}
			</form.AppField>

			{/* Description du projet */}
			<form.AppField
				name="details"
				validators={{
					onChange: ({ value }) => {
						if (!value || value.trim().length < 10) {
							return "Les détails doivent contenir au moins 10 caractères";
						}
						return undefined;
					},
				}}
			>
				{(field) => (
					<field.TextareaField
						label="Décrivez votre projet"
						required
						rows={4}
						maxLength={2000}
						showCounter
						placeholder="Décrivez votre idée de bijou... Par exemple : Je cherche un bracelet pour un anniversaire de mariage, dans des tons dorés avec des perles..."
					/>
				)}
			</form.AppField>

			{/* Images d'inspiration (optionnel) */}
			<form.Subscribe selector={(state) => state.values.inspirationMedias}>
				{(medias) => (
					<InspirationMediaUpload
						medias={medias}
						onMediasChange={(newMedias) => form.setFieldValue("inspirationMedias", newMedias)}
						onDeleteMedia={(url) => {
							form.setFieldValue("deletedImageUrls", [
								...form.getFieldValue("deletedImageUrls"),
								url,
							]);
						}}
					/>
				)}
			</form.Subscribe>

			{/* Hidden input for deleted image URLs (UploadThing cleanup on submit) */}
			<form.Subscribe selector={(state) => state.values.deletedImageUrls}>
				{(deletedUrls) =>
					deletedUrls.length > 0 ? (
						<input type="hidden" name="deletedImageUrls" value={JSON.stringify(deletedUrls)} />
					) : null
				}
			</form.Subscribe>

			{/* Prénom */}
			<form.AppField
				name="firstName"
				validators={{
					onChange: ({ value }) => {
						if (!value || value.trim().length < 2) {
							return "Le prénom doit contenir au moins 2 caractères";
						}
						return undefined;
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

			{/* Email */}
			<form.AppField
				name="email"
				validators={{
					onChange: ({ value }) => {
						if (!value) {
							return "L'adresse email est requise";
						}
						if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
							return "Vérifiez le format de votre email (ex: nom@domaine.com)";
						}
						return undefined;
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

			{/* Submit sticky sur mobile */}
			<div className="bg-background/95 border-border/50 sticky bottom-0 -mx-4 flex justify-center border-t px-4 py-4 backdrop-blur-sm sm:static sm:mx-0 sm:justify-start sm:border-0 sm:bg-transparent sm:px-0 sm:py-4 sm:backdrop-blur-none">
				<form.Subscribe selector={(state) => [state.canSubmit]}>
					{([canSubmit]) => (
						<Button
							type="submit"
							disabled={!canSubmit || isPending}
							size="lg"
							className="group relative w-full overflow-hidden sm:w-auto sm:min-w-55"
							aria-busy={isPending}
						>
							{isPending ? (
								"Envoi en cours..."
							) : (
								<>
									Envoyer mon message
									<span className="from-accent/0 via-accent/20 to-accent/0 absolute inset-0 bg-linear-to-r opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
								</>
							)}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
