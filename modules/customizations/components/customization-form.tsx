"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import {
	ResponsiveSelect,
	type ResponsiveSelectOption,
} from "@/shared/components/responsive-select";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import { X } from "lucide-react";
import { toast } from "sonner";

import { useCustomizationForm } from "../hooks/use-customization-form";
import type { ProductType } from "../types/customization.types";

interface CustomizationFormProps {
	productTypes: ProductType[];
	onSuccess?: () => void;
}

export function CustomizationForm({ productTypes, onSuccess }: CustomizationFormProps) {
	const { form, action, isPending } = useCustomizationForm({
		onSuccess: () => {
			form.reset();
			onSuccess?.();
			toast.success("Message envoyé !", {
				description: "Je vous réponds sous 24-48h avec un devis personnalisé",
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
					const hasError = field.state.meta.errors && field.state.meta.errors.length > 0;

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
						if (!value || value.trim().length < 20) {
							return "Les détails doivent contenir au moins 20 caractères";
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
			<form.Subscribe selector={(state) => state.values.inspirationImageUrls}>
				{(urls) => (
					<div className="space-y-2">
						<FieldLabel htmlFor="inspirationImages" optional>
							Images d&apos;inspiration
						</FieldLabel>
						<p className="text-muted-foreground text-sm">
							Ajoutez jusqu&apos;à 5 images pour illustrer votre idée
						</p>

						{urls.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{urls.map((url, index) => (
									<div key={url} className="group relative">
										<img
											src={url}
											alt={`Inspiration ${index + 1}`}
											className="h-20 w-20 rounded-md border object-cover"
										/>
										<button
											type="button"
											onClick={() => {
												const newUrls = urls.filter((_, i) => i !== index);
												form.setFieldValue("inspirationImageUrls", newUrls);
											}}
											className="bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
											aria-label={`Supprimer l'image ${index + 1}`}
										>
											<X className="h-3 w-3" />
										</button>
									</div>
								))}
							</div>
						)}

						{urls.length < 5 && (
							<UploadDropzone
								endpoint="customizationMedia"
								onClientUploadComplete={(res) => {
									const newUrls = [...urls, ...res.map((f) => f.ufsUrl)].slice(0, 5);
									form.setFieldValue("inspirationImageUrls", newUrls);
								}}
								onUploadError={(error) => {
									toast.error(error.message || "Erreur lors de l'upload");
								}}
								config={{ mode: "auto" }}
								content={{
									label: () => "Glissez vos images ou cliquez pour parcourir",
									allowedContent: () => "Images (JPEG, PNG, WebP) — 4 Mo max",
								}}
								className="border-border/50 ut-uploading:border-primary/50 rounded-lg border-2 border-dashed"
							/>
						)}

						<input type="hidden" name="inspirationImageUrls" value={JSON.stringify(urls)} />
					</div>
				)}
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

			{/* Consentement RGPD */}
			<form.AppField
				name="rgpdConsent"
				validators={{
					onChange: ({ value }) => {
						if (!value) {
							return "Vous devez accepter la politique de confidentialité pour continuer";
						}
						return undefined;
					},
				}}
			>
				{(field) => (
					<div className="space-y-1">
						<field.CheckboxField label="J'accepte la politique de confidentialité" required />
						<p className="text-muted-foreground ml-7 text-sm leading-relaxed">
							Consultez notre{" "}
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
