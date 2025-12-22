"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { Badge } from "@/shared/components/ui/badge";
import { Autocomplete } from "@/shared/components/autocomplete";
import { X } from "lucide-react";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { toast } from "sonner";

import { useCustomizationForm } from "../hooks/use-customization-form";
import type { ProductSearchResult, ProductType } from "../types/customization.types";

interface CustomizationFormProps {
	productTypes: ProductType[];
	productSearchQuery: string;
	productSearchResults: ProductSearchResult[];
	onSuccess?: () => void;
}

export function CustomizationForm({
	productTypes,
	productSearchQuery,
	productSearchResults,
	onSuccess,
}: CustomizationFormProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isSearchPending, startSearchTransition] = useTransition();

	// État local pour les produits sélectionnés
	const [selectedProducts, setSelectedProducts] = useState<ProductSearchResult[]>([]);
	const [localSearchValue, setLocalSearchValue] = useState(productSearchQuery);

	const { form, action, isPending } = useCustomizationForm({
		onSuccess: () => {
			form.reset();
			setSelectedProducts([]);
			setLocalSearchValue("");
			// Nettoyer l'URL
			const params = new URLSearchParams(searchParams.toString());
			params.delete("productSearch");
			router.replace(`?${params.toString()}`, { scroll: false });
			onSuccess?.();
			toast.success("Message envoyé !", {
				description: "Je te réponds sous 24-48h avec un devis personnalisé",
				duration: 8000,
			});
		},
	});

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

			{/* Champs cachés pour les multi-selects */}
			<form.Subscribe
				selector={(state) => [
					state.values.productTypeLabel,
					state.values.inspirationProductIds,
				]}
			>
				{([productTypeLabel, inspirationProductIds]) => (
					<>
						{productTypeLabel && (
							<input type="hidden" name="productTypeLabel" value={productTypeLabel} />
						)}
						{(inspirationProductIds as string[])?.map((id) => (
							<input key={id} type="hidden" name="inspirationProductIds" value={id} />
						))}
					</>
				)}
			</form.Subscribe>

			<form.AppForm>
				<form.FormErrorDisplay />
			</form.AppForm>

			<RequiredFieldsNote />

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
										"px-4 py-2.5 rounded-full text-sm font-medium transition-all",
										"border hover:border-primary/50 hover:shadow-sm",
										field.state.value === type.label
											? "bg-primary text-primary-foreground border-primary shadow-sm"
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
									"px-4 py-2.5 rounded-full text-sm font-medium transition-all",
									"border hover:border-primary/50 hover:shadow-sm",
									field.state.value === "Autre"
										? "bg-primary text-primary-foreground border-primary shadow-sm"
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

			{/* Créations inspirantes (optionnel) */}
			<div className="space-y-2">
				<FieldLabel
					optional
					tooltip="Sélectionne jusqu'à 5 créations existantes qui t'inspirent"
				>
					Créations qui t'inspirent
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
					placeholder="Rechercher une création..."
					isLoading={isSearchPending}
					minQueryLength={0}
					disabled={isPending || selectedProducts.length >= 5}
					noResultsMessage="Aucune création trouvée"
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
									className="ml-1 rounded-full p-1 -mr-0.5 hover:bg-muted-foreground/20 transition-colors"
									aria-label={`Retirer ${product.title}`}
								>
									<X className="size-4" />
								</button>
							</Badge>
						))}
					</div>
				)}
				<p className="text-sm text-muted-foreground">
					{selectedProducts.length}/5 créations sélectionnées
				</p>
			</div>

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
					{(field) => <field.InputField label="Prénom" required />}
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
					{(field) => <field.InputField label="Nom" required />}
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
				{(field) => <field.InputField label="Adresse email" type="email" required />}
			</form.AppField>

			{/* Téléphone */}
			<form.AppField name="phone">
				{(field) => (
					<field.PhoneField
						label="Téléphone"
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
							</a>
						</p>
					</div>
				)}
			</form.AppField>

			{/* Submit sticky sur mobile */}
			<div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 py-4 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:py-4 sm:mx-0 flex justify-center sm:justify-start">
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
