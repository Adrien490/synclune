"use client";

import { useStore } from "@tanstack/react-form";

import { useAddressAutocomplete } from "@/modules/addresses/hooks/use-address-autocomplete";
import type { AddressFormInstance } from "@/modules/addresses/hooks/use-address-form";
import type { SearchAddressResult } from "@/modules/addresses/types/search-address.types";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";

interface AddressFormFieldsProps {
	form: AddressFormInstance;
	isPending: boolean;
}

/**
 * Champs du formulaire d'adresse — partagés entre la dialog desktop
 * (`AddressFormDialog`) et la page dédiée mobile (`CreateAddressPageForm`).
 *
 * Inclut la note des champs obligatoires + l'autocomplétion d'adresse (FR only,
 * le champ pays est désactivé). N'affiche PAS les alertes succès/erreur ni le
 * footer de soumission : chaque conteneur (dialog / page) porte sa propre logique.
 */
export function AddressFormFields({ form, isPending }: AddressFormFieldsProps) {
	// Live address autocomplete (account CRUD is FR-only — country field disabled).
	const address1Value = useStore(form.store, (s) => s.values.address1);
	const {
		suggestions: addressSuggestions,
		isSearching: isPendingAddress,
		error: addressSearchErrorMessage,
	} = useAddressAutocomplete(address1Value, "FR");

	const triggerHaptic = useHaptic();
	const handleManualEntry = () => {
		triggerHaptic("light");
		document.querySelector<HTMLInputElement>('input[name="postalCode"]')?.focus();
	};

	return (
		<>
			<RequiredFieldsNote />

			<div className="space-y-4">
				{/* Nom et Prénom */}
				<div className="grid gap-4 sm:grid-cols-2">
					<form.AppField name="firstName">
						{(field) => (
							<field.InputField
								label="Prénom"
								type="text"
								autoComplete="given-name"
								autoCapitalize="words"
								enterKeyHint="next"
								disabled={isPending}
								required
							/>
						)}
					</form.AppField>

					<form.AppField name="lastName">
						{(field) => (
							<field.InputField
								label="Nom"
								type="text"
								autoComplete="family-name"
								autoCapitalize="words"
								enterKeyHint="next"
								disabled={isPending}
								required
							/>
						)}
					</form.AppField>
				</div>

				{/* Adresse avec autocomplétion */}
				<form.AppField name="address1">
					{(field) => (
						<div className="space-y-1.5">
							<field.AutocompleteField<SearchAddressResult>
								label="Adresse"
								required
								onSelect={(selectedAddress) => {
									// Remplir automatiquement les champs avec l'adresse sélectionnée
									field.handleChange(
										selectedAddress.street && selectedAddress.housenumber
											? `${selectedAddress.housenumber} ${selectedAddress.street}`
											: selectedAddress.label,
									);

									// Mise à jour des autres champs
									if (selectedAddress.postcode) {
										form.setFieldValue("postalCode", selectedAddress.postcode);
									}
									if (selectedAddress.city) {
										form.setFieldValue("city", selectedAddress.city);
									}
								}}
								items={addressSuggestions}
								getItemLabel={(item) => item.label}
								getItemDescription={(item) =>
									item.postcode && item.city ? `${item.postcode} ${item.city}` : item.city || null
								}
								placeholder="Rechercher une adresse…"
								isLoading={isPendingAddress}
								disabled={isPending}
								error={addressSearchErrorMessage ?? undefined}
								noResultsMessage="Aucune adresse trouvée"
								noResultsDescription="Essayez avec un autre nom de rue ou de ville"
								emptyStateAction={
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="min-h-11"
										onClick={handleManualEntry}
										disabled={isPending}
									>
										Saisir manuellement
									</Button>
								}
								autoComplete="street-address"
								minQueryLength={2}
								debounceMs={300}
							/>
							<p className="text-muted-foreground text-xs">
								Saisissez votre adresse pour la rechercher, ou complétez les champs manuellement
								ci-dessous.
							</p>
						</div>
					)}
				</form.AppField>

				{/* Complément d'adresse */}
				<form.AppField name="address2">
					{(field) => (
						<div className="space-y-2">
							<field.InputField
								label="Complément d'adresse (optionnel)"
								type="text"
								autoComplete="address-line2"
								enterKeyHint="next"
								disabled={isPending}
							/>
							<p className="text-muted-foreground text-xs">Appartement, bâtiment, etc.</p>
						</div>
					)}
				</form.AppField>

				{/* Code postal et Ville */}
				<div className="grid gap-4 sm:grid-cols-2">
					<form.AppField name="postalCode">
						{(field) => (
							<field.InputField
								label="Code postal"
								type="text"
								inputMode="numeric"
								autoComplete="postal-code"
								pattern="[0-9]{5}"
								enterKeyHint="next"
								disabled={isPending}
								maxLength={5}
								description="5 chiffres (ex. 44000), sans espace ni tiret."
								required
							/>
						)}
					</form.AppField>

					<form.AppField name="city">
						{(field) => (
							<field.InputField
								label="Ville"
								type="text"
								autoComplete="address-level2"
								autoCapitalize="words"
								enterKeyHint="next"
								disabled={isPending}
								required
							/>
						)}
					</form.AppField>
				</div>

				{/* Pays */}
				<form.AppField name="country">
					{(field) => (
						<div className="space-y-2">
							<field.InputField label="Pays" type="text" disabled={true} required />
							<p className="text-muted-foreground text-xs">
								Actuellement, seules les livraisons en France sont disponibles
							</p>
						</div>
					)}
				</form.AppField>

				{/* Téléphone */}
				<form.AppField name="phone">
					{(field) => (
						<field.PhoneField
							label="Téléphone"
							required
							defaultCountry="FR"
							placeholder="06 12 34 56 78"
							disabled={isPending}
						/>
					)}
				</form.AppField>
			</div>
		</>
	);
}
