"use client";

import type { Session } from "@/modules/auth/lib/auth";
import type { CheckoutFormInstance } from "../hooks/use-checkout-form";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
	type ShippingCountry,
} from "@/shared/constants/countries";
import { useAddressAutocomplete } from "../hooks/use-address-autocomplete";
import type { SearchAddressResult } from "@/modules/addresses/types/search-address.types";
import { AddressSelector } from "./address-selector";
import { CheckoutErrorSummary } from "./checkout-error-summary";

const countryOptions = SORTED_SHIPPING_COUNTRIES.map((code) => ({
	value: code,
	label: COUNTRY_NAMES[code],
}));

const CHECKOUT_FIELD_LABELS: Record<string, string> = {
	email: "Adresse email",
	"shipping.fullName": "Nom complet",
	"shipping.addressLine1": "Adresse",
	"shipping.postalCode": "Code postal",
	"shipping.city": "Ville",
	"shipping.country": "Pays",
	"shipping.phoneNumber": "Téléphone",
};

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
		<form.AppField name="shipping.addressLine1">
			{(field) => (
				<field.AutocompleteField<SearchAddressResult>
					label="Adresse"
					required
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

	// Countries with purely numeric postal codes (most EU countries)
	const NUMERIC_POSTAL_CODE_COUNTRIES = new Set([
		"FR",
		"MC",
		"DE",
		"ES",
		"IT",
		"PT",
		"AT",
		"FI",
		"SE",
		"DK",
		"GR",
		"BG",
		"HR",
		"CY",
		"CZ",
		"EE",
		"HU",
		"LV",
		"LT",
		"PL",
		"RO",
		"SK",
		"SI",
	]);

	return (
		<fieldset className="space-y-5">
			<p className="text-muted-foreground text-sm">
				Les champs marqués d'un <span className="text-destructive">*</span> sont obligatoires.
			</p>

			{/* Error summary */}
			<form.Subscribe
				selector={(s) => ({
					submissionAttempts: s.submissionAttempts,
					canSubmit: s.canSubmit,
					fieldMeta: s.fieldMeta,
				})}
			>
				{({ submissionAttempts, canSubmit, fieldMeta }) => {
					if (submissionAttempts === 0 || canSubmit) return null;

					const fieldErrors = Object.entries(fieldMeta as Record<string, { errors: string[] }>)
						.filter(([, meta]) => meta.errors.length > 0)
						.map(([name, meta]) => ({
							name,
							label: CHECKOUT_FIELD_LABELS[name] ?? name,
							message: meta.errors[0] as string,
						}));

					return <CheckoutErrorSummary fieldErrors={fieldErrors} />;
				}}
			</form.Subscribe>

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
						autoComplete="country-name"
					/>
				)}
			</form.AppField>

			<form.Subscribe selector={(s) => s.values.shipping.country}>
				{(country) => (
					<form.AppField name="shipping.phoneNumber">
						{(field) => (
							<div className="space-y-2">
								<field.PhoneField
									label="Téléphone"
									required
									defaultCountry={((country as string) || "FR") as ShippingCountry}
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
