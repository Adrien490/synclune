"use client";

import { FormLayout, FormSection } from "@/shared/components/tanstack-form";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import {
	Shield,
	Sparkles,
	UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomizationForm } from "../hooks/use-customization-form";

type ProductType = {
	id: string;
	label: string;
	slug: string;
};

interface CustomizationFormProps {
	productTypes: ProductType[];
	onSuccess?: () => void;
}

export function CustomizationForm({ productTypes, onSuccess }: CustomizationFormProps) {
	const { form, action, isPending } = useCustomizationForm({
		onSuccess: () => {
			// Reset le formulaire
			form.reset();

			// Call custom success callback
			onSuccess?.();

			// Afficher toast de succès
			toast.success("Message envoyé !", {
				description: "Je te réponds sous 24-48h avec un devis personnalisé",
				duration: 8000,
			});
		},
	});

	return (
		<form
			action={action}
			className="space-y-8"
			onSubmit={() => {
				void form.handleSubmit();
			}}
		>
			{/* Champ honeypot caché (anti-spam) */}
			<input
				type="text"
				name="website"
				className="hidden"
				aria-hidden="true"
				tabIndex={-1}
			/>

			{/* Champ caché pour le type de produit */}
			<form.Subscribe selector={(state) => [state.values.jewelryType]}>
				{([jewelryType]) =>
					jewelryType ? (
						<input type="hidden" name="jewelryType" value={jewelryType} />
					) : null
				}
			</form.Subscribe>

			{/* Erreurs globales du formulaire */}
			<form.AppForm>
				<form.FormErrorDisplay />
			</form.AppForm>

			<RequiredFieldsNote />

			{/* SECTIONS 1 & 2 : Coordonnées + Personnalisation en 2 colonnes */}
			<FormLayout cols={2}>
				{/* SECTION 1 : Informations personnelles */}
				<FormSection
					title="Tes coordonnées"
					description="Pour que je puisse te recontacter et discuter de ton projet"
					icon={<UserCircle className="w-5 h-5" />}
				>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Prénom */}
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
									autoFocus
								/>
							)}
						</form.AppField>

						{/* Nom */}
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
								<field.InputField label="Nom" required />
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
								// Simple email validation
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
							/>
						)}
					</form.AppField>

					{/* Téléphone (optionnel) */}
					<form.AppField name="phone">
						{(field) => (
							<div className="space-y-2">
								<field.InputField
									label="Téléphone"
									type="tel"
									placeholder="06 12 34 56 78"
								/>
								<p className="text-xs text-muted-foreground">
									Format français (ex: 06 12 34 56 78 ou +33 6 12 34 56 78)
								</p>
							</div>
						)}
					</form.AppField>
				</FormSection>

				{/* SECTION 2 : Détails de personnalisation */}
				<FormSection
					title="Ton projet de produit"
					description="Raconte-moi tout ! Même si l'idée n'est pas encore claire, on affinera ensemble"
					icon={<Sparkles className="w-5 h-5" />}
				>
					{/* Type de produit */}
					<form.AppField
						name="jewelryType"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) {
									return "Sélectionne un type de produit";
								}
							},
						}}
					>
						{(field) => (
							<field.SelectField
								label="Type de produit"
								required
								placeholder="Sélectionnez un type de produit"
								options={[
									...productTypes.map((type) => ({
										value: type.label,
										label: type.label,
									})),
									{ value: "Autre", label: "Autre" },
								]}
							/>
						)}
					</form.AppField>

					{/* Détails de personnalisation */}
					<form.AppField
						name="customizationDetails"
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
									label="Détails de ton projet"
									required
									rows={8}
									placeholder="N'hésite pas à me donner tous les détails : couleurs préférées, inspirations (Pokémon, Van Gogh, autre ?), occasion spéciale, matériaux souhaités... Plus j'en sais, mieux c'est !"
								/>
								<p className="text-xs text-muted-foreground text-right">
									{field.state.value?.length || 0} / 1000 caractères
								</p>
							</div>
						)}
					</form.AppField>
				</FormSection>
			</FormLayout>

			{/* SECTION 3 : Consentements */}
			<FormSection
				title="Consentements"
				description="Informations légales et newsletter"
				icon={<Shield className="w-5 h-5" />}
			>
				{/* RGPD */}
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
						<div className="space-y-2">
							<field.CheckboxField
								label="J'accepte la politique de confidentialité"
								required
							/>
							<p className="text-xs/5 tracking-normal antialiased text-muted-foreground ml-8">
								Consultez notre{" "}
								<a
									href="/confidentialite"
									className="text-foreground underline hover:no-underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									Politique de confidentialité
								</a>
							</p>
						</div>
					)}
				</form.AppField>

				{/* Newsletter */}
				<form.AppField name="newsletter">
					{(field) => (
						<div className="space-y-2">
							<field.CheckboxField label="Je souhaite m'inscrire à la newsletter" />
						</div>
					)}
				</form.AppField>
			</FormSection>

			{/* Footer avec bouton d'action */}
			<div className="mt-6">
				<div className="flex flex-col sm:flex-row justify-end gap-3">
					<form.Subscribe
						selector={(state) => [state.canSubmit]}
					>
						{([canSubmit]) => (
							<Button
								type="submit"
								disabled={!canSubmit || isPending}
								size="lg"
								className="min-w-[200px] relative overflow-hidden group"
							>
								{isPending ? (
									"Envoi en cours..."
								) : (
									<>
										Envoyer mon message
										{/* Halo doré au survol */}
										<span className="absolute inset-0 bg-linear-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
									</>
								)}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</div>
		</form>
	);
}
