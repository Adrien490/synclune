"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormSection, FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { Badge } from "@/shared/components/ui/badge";
import { Autocomplete } from "@/shared/components/autocomplete";
import { MultiSelect, type MultiSelectOption } from "@/shared/components/multi-select";
import { Sparkles, UserCircle, Palette, X } from "lucide-react";
import {
	WizardProvider,
	useFormWizard,
	WizardStepContainer,
	WizardMobileShell,
	createTanStackFormAdapter,
	useUnsavedChanges,
	type WizardStep,
} from "@/shared/features/form-wizard";
import { cn } from "@/shared/utils/cn";
import { toast } from "sonner";

import { useCustomizationForm } from "../hooks/use-customization-form";
import type { ProductSearchResult, ProductType } from "../types/customization.types";
import type { Color } from "@/modules/colors/types/color.types";
import type { Material } from "@/modules/materials/types/materials.types";

interface CustomizationFormProps {
	productTypes: ProductType[];
	productSearchQuery: string;
	productSearchResults: ProductSearchResult[];
	colors: Color[];
	materials: Material[];
	onSuccess?: () => void;
}

const CUSTOMIZATION_STEPS: WizardStep[] = [
	{
		id: "projet",
		label: "Ton projet",
		description: "Type de bijou et description",
		icon: <Sparkles className="size-4" />,
		fields: ["productTypeLabel", "details"],
	},
	{
		id: "inspirations",
		label: "Inspirations",
		description: "Couleurs et créations inspirantes",
		icon: <Palette className="size-4" />,
		fields: ["inspirationProductIds", "preferredColorIds", "preferredMaterialIds"],
		optional: true,
	},
	{
		id: "coordonnees",
		label: "Coordonnées",
		description: "Pour te recontacter",
		icon: <UserCircle className="size-4" />,
		fields: ["firstName", "lastName", "email", "phone", "rgpdConsent"],
	},
];

export function CustomizationForm(props: CustomizationFormProps) {
	return (
		<WizardProvider totalSteps={CUSTOMIZATION_STEPS.length}>
			<CustomizationFormContent {...props} />
		</WizardProvider>
	);
}

function CustomizationFormContent({
	productTypes,
	productSearchQuery,
	productSearchResults,
	colors,
	materials,
	onSuccess,
}: CustomizationFormProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isSearchPending, startSearchTransition] = useTransition();

	// État local pour les produits sélectionnés
	const [selectedProducts, setSelectedProducts] = useState<ProductSearchResult[]>([]);
	const [localSearchValue, setLocalSearchValue] = useState(productSearchQuery);

	// Ref pour réinitialiser le wizard après succès
	const resetWizardRef = { current: null as (() => void) | null };

	const { form, action, isPending } = useCustomizationForm({
		onSuccess: () => {
			form.reset();
			setSelectedProducts([]);
			setLocalSearchValue("");
			// Nettoyer l'URL
			const params = new URLSearchParams(searchParams.toString());
			params.delete("productSearch");
			router.replace(`?${params.toString()}`, { scroll: false });
			// Reset wizard sur mobile
			resetWizardRef.current?.();
			onSuccess?.();
			toast.success("Message envoyé !", {
				description: "Je te réponds sous 24-48h avec un devis personnalisé",
				duration: 8000,
			});
		},
	});

	// Créer le wizard avec le formulaire
	const wizard = useFormWizard({
		steps: CUSTOMIZATION_STEPS,
		form: createTanStackFormAdapter(form),
	});

	// Stocker la référence resetWizard pour le callback onSuccess (mobile uniquement)
	resetWizardRef.current = wizard.isMobile ? wizard.resetWizard : null;

	// Avertir l'utilisateur des changements non sauvegardés
	useUnsavedChanges(form.state.isDirty && !isPending);

	// Mise à jour de l'URL pour la recherche de produits
	const updateProductSearch = (value: string) => {
		setLocalSearchValue(value);
		startSearchTransition(() => {
			const params = new URLSearchParams(searchParams.toString());
			if (value) {
				params.set("productSearch", value);
			} else {
				params.delete("productSearch");
			}
			router.replace(`?${params.toString()}`, { scroll: false });
		});
	};

	// Sélection d'un produit depuis l'autocomplete
	const handleProductSelect = (product: ProductSearchResult) => {
		if (selectedProducts.length >= 5) {
			toast.error("Maximum 5 produits", {
				description: "Tu peux sélectionner jusqu'à 5 créations pour t'inspirer",
			});
			return;
		}
		if (selectedProducts.find((p) => p.id === product.id)) {
			return;
		}
		const newSelected = [...selectedProducts, product];
		setSelectedProducts(newSelected);
		form.setFieldValue("inspirationProductIds", newSelected.map((p) => p.id));
		setLocalSearchValue("");
		const params = new URLSearchParams(searchParams.toString());
		params.delete("productSearch");
		router.replace(`?${params.toString()}`, { scroll: false });
	};

	// Suppression d'un produit sélectionné
	const handleProductRemove = (productId: string) => {
		const newSelected = selectedProducts.filter((p) => p.id !== productId);
		setSelectedProducts(newSelected);
		form.setFieldValue("inspirationProductIds", newSelected.map((p) => p.id));
	};

	// Convertir les couleurs en options pour MultiSelect
	const colorOptions: MultiSelectOption[] = colors.map((color) => ({
		label: color.name,
		value: color.id,
		style: { badgeColor: color.hex },
	}));

	// Convertir les matériaux en options pour MultiSelect
	const materialOptions: MultiSelectOption[] = materials.map((material) => ({
		label: material.name,
		value: material.id,
	}));

	// Rendu du contenu de chaque étape
	const renderStepContent = (stepIndex: number) => {
		switch (stepIndex) {
			case 0:
				return (
					<FormSection
						title="Ton projet de bijou"
						description="Raconte-moi tout ! Meme si l'idee n'est pas encore claire, on affinera ensemble"
						icon={<Sparkles className="w-5 h-5" />}
						hideHeader={wizard.effectiveMode === "wizard"}
					>
						{/* Type de bijou (optionnel) */}
						<form.AppField name="productTypeLabel">
							{(field) => (
								<div className="space-y-3">
									<FieldLabel optional>Type de bijou</FieldLabel>
									<div className="flex flex-wrap gap-2">
										{productTypes.map((type) => (
											<button
												key={type.id}
												type="button"
												onClick={() => field.handleChange(type.label)}
												className={cn(
													"px-3 py-1.5 rounded-full text-sm font-medium transition-all",
													"border hover:border-primary/50",
													field.state.value === type.label
														? "bg-primary text-primary-foreground border-primary"
														: "bg-background text-muted-foreground border-border hover:text-foreground"
												)}
											>
												{type.label}
											</button>
										))}
										<button
											type="button"
											onClick={() => field.handleChange("Autre")}
											className={cn(
												"px-3 py-1.5 rounded-full text-sm font-medium transition-all",
												"border hover:border-primary/50",
												field.state.value === "Autre"
													? "bg-primary text-primary-foreground border-primary"
													: "bg-background text-muted-foreground border-border hover:text-foreground"
											)}
										>
											Autre
										</button>
									</div>
									{field.state.meta.errors && field.state.meta.errors.length > 0 && (
										<p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
									)}
								</div>
							)}
						</form.AppField>

						{/* Détails de personnalisation */}
						<form.AppField
							name="details"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value || value.trim().length < 20) {
										return "Les details doivent contenir au moins 20 caracteres";
									}
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<field.TextareaField
										label="Decris ton projet"
										required
										rows={6}
										placeholder="Decris ton idee de bijou..."
									/>
									<p className="text-xs text-muted-foreground">
										Par exemple : "Je cherche un bracelet pour un anniversaire de mariage, dans des tons dores avec des perles..." Quelques phrases suffisent !
									</p>
									<p className="text-xs text-muted-foreground text-right">
										{field.state.value?.length || 0} / 2000 caracteres
									</p>
								</div>
							)}
						</form.AppField>
					</FormSection>
				);

			case 1:
				return (
					<FormSection
						title="Inspirations et preferences"
						description="Aide-moi a comprendre tes gouts (facultatif)"
						icon={<Palette className="w-5 h-5" />}
						hideHeader={wizard.effectiveMode === "wizard"}
					>
						{/* Produits inspirants - Autocomplete */}
						<div className="space-y-2">
							<FieldLabel
								optional
								tooltip="Selectionne jusqu'a 5 creations existantes qui t'inspirent"
							>
								Creations qui t'inspirent
							</FieldLabel>
							<Autocomplete
								name="productSearch"
								value={localSearchValue}
								onChange={updateProductSearch}
								onSelect={handleProductSelect}
								items={productSearchResults}
								getItemLabel={(p) => p.title}
								getItemDescription={(p) => p.description}
								getItemImage={(p) =>
									p.imageUrl
										? { src: p.imageUrl, alt: p.title, blurDataUrl: p.blurDataUrl }
										: null
								}
								imageSize={48}
								placeholder="Rechercher une creation..."
								isLoading={isSearchPending}
								minQueryLength={0}
								disabled={isPending || selectedProducts.length >= 5}
								noResultsMessage="Aucune creation trouvee"
								showSearchIcon
								showClearButton
							/>
							{selectedProducts.length > 0 && (
								<div className="flex flex-wrap gap-1.5 mt-2">
									{selectedProducts.map((product) => (
										<Badge key={product.id} variant="secondary" className="pr-1 gap-1">
											{product.title}
											<button
												type="button"
												onClick={() => handleProductRemove(product.id)}
												className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
												aria-label={`Retirer ${product.title}`}
											>
												<X className="size-3" />
											</button>
										</Badge>
									))}
								</div>
							)}
							<p className="text-xs text-muted-foreground">
								{selectedProducts.length}/5 creations selectionnees
							</p>
						</div>

						{/* Couleurs et Materiaux */}
						<div className="space-y-6">
							<form.AppField name="preferredColorIds">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel
											optional
											tooltip="Selectionne les couleurs que tu aimerais voir dans ta creation"
										>
											Couleurs preferees
										</FieldLabel>
										<MultiSelect
											options={colorOptions}
											defaultValue={field.state.value || []}
											onValueChange={(value) => field.handleChange(value)}
											placeholder="Choisir des couleurs..."
											maxCount={5}
											disabled={isPending}
											searchable={false}
										/>
									</div>
								)}
							</form.AppField>

							<form.AppField name="preferredMaterialIds">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel
											optional
											tooltip="Selectionne les materiaux que tu preferes"
										>
											Materiaux souhaites
										</FieldLabel>
										<MultiSelect
											options={materialOptions}
											defaultValue={field.state.value || []}
											onValueChange={(value) => field.handleChange(value)}
											placeholder="Choisir des materiaux..."
											maxCount={3}
											disabled={isPending}
											searchable={false}
										/>
									</div>
								)}
							</form.AppField>
						</div>
					</FormSection>
				);

			case 2:
				return (
					<FormSection
						title="Tes coordonnees"
						description="Pour que je puisse te recontacter et discuter de ton projet"
						icon={<UserCircle className="w-5 h-5" />}
						hideHeader={wizard.effectiveMode === "wizard"}
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<form.AppField
								name="firstName"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value || value.trim().length < 2) {
											return "Le prenom doit contenir au moins 2 caracteres";
										}
									},
								}}
							>
								{(field) => <field.InputField label="Prenom" required />}
							</form.AppField>

							<form.AppField
								name="lastName"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value || value.trim().length < 2) {
											return "Le nom doit contenir au moins 2 caracteres";
										}
									},
								}}
							>
								{(field) => <field.InputField label="Nom" required />}
							</form.AppField>
						</div>

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
							{(field) => <field.InputField label="Adresse email" type="email" required />}
						</form.AppField>

						<form.AppField name="phone">
							{(field) => (
								<div className="space-y-2">
									<field.InputField label="Telephone" type="tel" placeholder="06 12 34 56 78" />
									<p className="text-xs text-muted-foreground">
										Facultatif - Format francais (ex: 06 12 34 56 78)
									</p>
								</div>
							)}
						</form.AppField>

						{/* Consentement RGPD */}
						<form.AppField
							name="rgpdConsent"
							validators={{
								onChange: ({ value }: { value: boolean }) => {
									if (!value) {
										return "Tu dois accepter la politique de confidentialite pour continuer";
									}
								},
							}}
						>
							{(field) => (
								<div className="space-y-1 pt-4 border-t border-border/50">
									<field.CheckboxField
										label="J'accepte la politique de confidentialite"
										required
									/>
									<p className="text-xs/5 tracking-normal antialiased text-muted-foreground ml-7">
										Consulte notre{" "}
										<a
											href="/confidentialite"
											className="text-foreground underline hover:no-underline"
											target="_blank"
											rel="noopener noreferrer"
										>
											Politique de confidentialite
										</a>
									</p>
								</div>
							)}
						</form.AppField>
					</FormSection>
				);

			default:
				return null;
		}
	};

	// Footer desktop
	const renderFooter = () => (
		<div className="mt-6">
			<div className="flex flex-col sm:flex-row justify-end gap-3">
				<form.Subscribe selector={(state) => [state.canSubmit]}>
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
									<span className="absolute inset-0 bg-linear-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								</>
							)}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</div>
	);

	// Champs cachés communs
	const renderHiddenFields = () => (
		<>
			{/* Champ honeypot caché (anti-spam) */}
			<input
				type="text"
				name="website"
				className="hidden"
				aria-hidden="true"
				tabIndex={-1}
			/>

			{/* Champs cachés pour les multi-selects */}
			<form.Subscribe
				selector={(state) => [
					state.values.productTypeLabel,
					state.values.inspirationProductIds,
					state.values.preferredColorIds,
					state.values.preferredMaterialIds,
				]}
			>
				{([productTypeLabel, inspirationProductIds, preferredColorIds, preferredMaterialIds]) => (
					<>
						{productTypeLabel && (
							<input type="hidden" name="productTypeLabel" value={productTypeLabel} />
						)}
						{(inspirationProductIds as string[])?.map((id) => (
							<input key={id} type="hidden" name="inspirationProductIds" value={id} />
						))}
						{(preferredColorIds as string[])?.map((id) => (
							<input key={id} type="hidden" name="preferredColorIds" value={id} />
						))}
						{(preferredMaterialIds as string[])?.map((id) => (
							<input key={id} type="hidden" name="preferredMaterialIds" value={id} />
						))}
					</>
				)}
			</form.Subscribe>
		</>
	);

	// Mobile: Use wizard shell
	if (wizard.effectiveMode === "wizard") {
		return (
			<form
				action={action}
				className="space-y-6"
				onSubmit={() => void form.handleSubmit()}
			>
				{renderHiddenFields()}

				<form.AppForm>
					<form.FormErrorDisplay />
				</form.AppForm>

				<RequiredFieldsNote />

				<WizardMobileShell
					steps={CUSTOMIZATION_STEPS}
					currentStep={wizard.currentStep}
					completedSteps={wizard.completedSteps}
					onStepClick={wizard.goToStep}
					isFirstStep={wizard.isFirstStep}
					isLastStep={wizard.isLastStep}
					onPrevious={wizard.goPrevious}
					onNext={wizard.goNext}
					isSubmitting={isPending}
					isValidating={wizard.isValidating}
					getStepErrors={wizard.getStepErrors}
					renderLastStepFooter={() => (
						<div className="space-y-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={wizard.goPrevious}
								disabled={isPending}
								className="w-full text-muted-foreground"
							>
								← Étape précédente
							</Button>
							<form.Subscribe selector={(state) => [state.canSubmit]}>
								{([canSubmit]) => (
									<Button
										type="submit"
										disabled={!canSubmit || isPending}
										className="w-full h-12"
									>
										{isPending ? "Envoi en cours..." : "Envoyer mon message"}
									</Button>
								)}
							</form.Subscribe>
						</div>
					)}
				>
					{CUSTOMIZATION_STEPS.map((step, index) => (
						<WizardStepContainer key={step.id} step={step} stepIndex={index}>
							{renderStepContent(index)}
						</WizardStepContainer>
					))}
				</WizardMobileShell>
			</form>
		);
	}

	// Desktop: Show all sections
	return (
		<form
			action={action}
			className="space-y-8"
			onSubmit={() => void form.handleSubmit()}
		>
			{renderHiddenFields()}

			<form.AppForm>
				<form.FormErrorDisplay />
			</form.AppForm>

			<RequiredFieldsNote />

			{renderStepContent(0)}
			{renderStepContent(1)}
			{renderStepContent(2)}

			{renderFooter()}
		</form>
	);
}
