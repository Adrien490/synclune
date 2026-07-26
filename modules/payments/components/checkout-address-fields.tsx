"use client";

import type { Session } from "@/modules/auth/lib/auth";
import type { CheckoutFormInstance } from "../hooks/use-checkout-form";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
	NUMERIC_POSTAL_CODE_COUNTRIES,
	type ShippingCountry,
} from "@/shared/constants/countries";
import { useAddressAutocomplete } from "@/modules/addresses/hooks/use-address-autocomplete";
import type { SearchAddressResult } from "@/modules/addresses/types/search-address.types";
import { AddressSelector } from "./address-selector";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { isValidPhoneNumber } from "libphonenumber-js";
import { PHONE_ERROR_MESSAGES } from "@/shared/schemas/phone.schemas";

const countryOptions = SORTED_SHIPPING_COUNTRIES.map((code) => ({
	value: code,
	label: COUNTRY_NAMES[code],
}));

/**
 * Extracted sub-component for the address autocomplete field.
 * Must live outside CheckoutAddressFields to avoid re-mounting on every keystroke.
 */
function AddressAutocompleteField({
	form,
	query,
	country,
}: {
	form: CheckoutFormInstance;
	query: string;
	country: ShippingCountry;
}) {
	const { suggestions, isSearching, error, retry } = useAddressAutocomplete(query, country);

	return (
		<form.AppField
			name="shipping.addressLine1"
			validators={{
				onChange: ({ value }: { value: string }) => {
					if (!value || value.trim().length === 0) {
						return "L'adresse est requise";
					}
					return undefined;
				},
			}}
		>
			{(field) => (
				<field.AutocompleteField<SearchAddressResult>
					label="Adresse"
					required
					autoComplete="street-address"
					items={suggestions}
					isLoading={isSearching}
					error={error}
					onRetry={retry}
					getItemLabel={(item) => item.label}
					getItemDescription={(item) => [item.postcode, item.city].filter(Boolean).join(" ")}
					onSelect={(item) => {
						let addressLine1: string;
						if (item.housenumber && item.street) {
							addressLine1 = `${item.housenumber} ${item.street}`;
						} else {
							// Strip ", {postcode} {city}" suffix from fulltext
							addressLine1 = item.fulltext.replace(`, ${item.postcode} ${item.city}`, "");
						}
						field.handleChange(addressLine1);
						form.setFieldValue("shipping.postalCode", item.postcode);
						form.setFieldValue("shipping.city", item.city);
					}}
					placeholder=""
					minQueryLength={2}
					showSearchIcon={false}
					showEmptyState={false}
					enterKeyHint="next"
					autoCapitalize="words"
					// Le défaut de <Autocomplete> est `search` (pensé pour la recherche
					// produit) : sur iOS il sert un clavier de recherche là où l'on saisit
					// une rue. On force le clavier texte standard.
					inputMode="text"
				/>
			)}
		</form.AppField>
	);
}

interface CheckoutAddressFieldsProps {
	form: CheckoutFormInstance;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
}

export function CheckoutAddressFields({ form, session, addresses }: CheckoutAddressFieldsProps) {
	const isGuest = !session;

	return (
		<fieldset className="space-y-5">
			{/*
			 * Le résumé d'erreurs vit désormais en TÊTE de <form> (checkout-form-body),
			 * pas ici : il liste aussi les erreurs de la section Contact, donc rendu
			 * dans le fieldset Livraison il apparaissait SOUS le champ qu'il désignait.
			 */}
			<RequiredFieldsNote />

			{/* Address selector for logged-in users with multiple addresses */}
			{!isGuest && addresses && addresses.length > 1 && (
				<form.Subscribe selector={(s) => s.values._selectedAddressId}>
					{(selectedAddressId) => (
						<AddressSelector
							addresses={addresses}
							selectedAddressId={selectedAddressId}
							onSelectAddress={(address) => {
								form.setFieldValue("_selectedAddressId", address.id);
								const fullName = [address.firstName, address.lastName].filter(Boolean).join(" ");
								form.setFieldValue("shipping.fullName", fullName);
								form.setFieldValue("shipping.addressLine1", address.address1);
								form.setFieldValue("shipping.addressLine2", address.address2 ?? "");
								form.setFieldValue("shipping.city", address.city);
								form.setFieldValue("shipping.postalCode", address.postalCode);
								form.setFieldValue("shipping.country", address.country);
								form.setFieldValue("shipping.phoneNumber", address.phone);
							}}
						/>
					)}
				</form.Subscribe>
			)}

			{/* Full name */}
			<form.AppField
				name="shipping.fullName"
				validators={{
					onChange: ({ value }: { value: string }) => {
						if (!value || value.trim().length < 2) {
							return "Le nom complet doit contenir au moins 2 caractères";
						}
						return undefined;
					},
				}}
			>
				{(field) => (
					<field.InputField
						label="Nom complet"
						required
						autoComplete="name"
						autoCapitalize="words"
						autoCorrect="off"
						enterKeyHint="next"
					/>
				)}
			</form.AppField>

			<form.Subscribe
				selector={(s) => ({
					addressLine1: s.values.shipping.addressLine1,
					country: s.values.shipping.country,
				})}
			>
				{({ addressLine1, country: rawCtry }) => {
					const ctry = ((rawCtry as string) || "FR") as ShippingCountry;
					return <AddressAutocompleteField form={form} query={addressLine1} country={ctry} />;
				}}
			</form.Subscribe>

			<form.AppField name="shipping.addressLine2">
				{(field) => (
					<field.InputField
						label="Complément d'adresse"
						optional
						autoComplete="address-line2"
						enterKeyHint="next"
					/>
				)}
			</form.AppField>

			<div className="grid grid-cols-2 gap-3 sm:gap-6">
				<form.Subscribe selector={(s) => s.values.shipping.country}>
					{(selectedCountry) => {
						const isNumericPostalCode = NUMERIC_POSTAL_CODE_COUNTRIES.has(
							(selectedCountry as string) || "FR",
						);
						return (
							<form.AppField
								name="shipping.postalCode"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value) return "Le code postal est requis";
										if (value.length < 3 || value.length > 10) {
											return "Code postal invalide";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.InputField
										label="Code postal"
										required
										inputMode={isNumericPostalCode ? "numeric" : "text"}
										pattern={isNumericPostalCode ? "[0-9]*" : undefined}
										autoComplete="postal-code"
										autoCorrect="off"
										enterKeyHint="next"
										// Aligné sur la borne haute du validateur (10) — sans ça le
										// champ accepte une saisie que la validation rejettera.
										maxLength={10}
									/>
								)}
							</form.AppField>
						);
					}}
				</form.Subscribe>

				<form.AppField
					name="shipping.city"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value || value.trim().length < 2) {
								return "La ville est requise";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Ville"
							required
							autoComplete="address-level2"
							autoCapitalize="words"
							enterKeyHint="next"
						/>
					)}
				</form.AppField>
			</div>

			<form.AppField
				name="shipping.country"
				validators={{
					onChange: ({ value }: { value: string }) => {
						if (!value) return "Le pays est requis";
						return undefined;
					},
				}}
			>
				{(field) => (
					<field.SelectField
						label="Pays"
						required
						options={countryOptions}
						// `country` (code ISO), PAS `country-name` : les options ont pour
						// value un code (`countryOptions` ci-dessus). Avec `country-name`
						// l'autofill d'adresse OS tente d'injecter « France » dans un select
						// qui n'accepte que « FR » et échoue silencieusement.
						autoComplete="country"
					/>
				)}
			</form.AppField>

			<form.Subscribe selector={(s) => s.values.shipping.country}>
				{(country) => (
					<form.AppField
						name="shipping.phoneNumber"
						validators={{
							onChange: ({ value }: { value: string | undefined }) => {
								if (!value) return PHONE_ERROR_MESSAGES.REQUIRED;
								if (!isValidPhoneNumber(value)) return PHONE_ERROR_MESSAGES.INVALID;
								return undefined;
							},
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<field.PhoneField
									label="Téléphone"
									required
									defaultCountry={((country as string) || "FR") as ShippingCountry}
									// Dernier champ texte du formulaire dans les DEUX branches : la
									// case « enregistrer mes informations » qui suit (connecté)
									// n'est pas une saisie clavier — « done », jamais « next ».
									enterKeyHint="done"
								/>
								<p className="text-muted-foreground text-sm">
									Utilisé uniquement par le transporteur en cas de problème de livraison.
								</p>
							</div>
						)}
					</form.AppField>
				)}
			</form.Subscribe>

			{/* Save info (logged-in users only) */}
			{!isGuest && (
				<form.AppField name="saveInfo">
					{(field) => (
						<field.CheckboxField label="Enregistrer mes informations pour mes prochaines commandes" />
					)}
				</form.AppField>
			)}
		</fieldset>
	);
}
