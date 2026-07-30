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
				onDynamic: ({ value }: { value: string }) => {
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
	/**
	 * Gèle le PAYS et le CODE POSTAL — les deux seules composantes de l'adresse dont
	 * dépend le montant (tarif d'expédition). Posé quand une commande est déjà liée au
	 * PaymentIntent : le client peut alors corriger sa rue, sa ville ou son nom (le
	 * serveur répercute la correction sur le snapshot, cf. KI-001), mais pas déplacer sa
	 * livraison dans une autre zone tarifaire — ce que `resolveIdempotentHit` refuserait.
	 */
	lockDestination?: boolean;
}

export function CheckoutAddressFields({
	form,
	session,
	addresses,
	lockDestination = false,
}: CheckoutAddressFieldsProps) {
	const isGuest = !session;

	return (
		// `flex flex-col gap-5` et pas `space-y-5` : la <legend> sr-only est en
		// `position:absolute`, or `space-y-*` cible `& > * + *` et lui aurait collé
		// 20px de marge fantôme sur le premier vrai champ. Un enfant absolu ne
		// consomme aucun `gap`.
		<fieldset className="flex flex-col gap-5">
			<legend className="sr-only">Adresse de livraison</legend>
			{/*
			 * Ni le résumé d'erreurs ni la note « champs obligatoires » ne vivent ici :
			 * tous deux sont en TÊTE de <form> (checkout-form-body). Le résumé liste aussi
			 * les erreurs de la section Contact, et la note s'applique au champ email
			 * obligatoire de cette même section — rendus dans le fieldset Livraison, ils
			 * apparaissaient SOUS les champs qu'ils désignent.
			 */}

			{/* Address selector for logged-in users with multiple addresses */}
			{/* Masqué quand la destination est gelée : ce sélecteur réécrit le pays et le
			    code postal en bloc, ce que le serveur refuserait à la resoumission. */}
			{!lockDestination && !isGuest && addresses && addresses.length > 1 && (
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
					onDynamic: ({ value }: { value: string }) => {
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
									onDynamic: ({ value }: { value: string }) => {
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
										// Gelé avec le montant : le tarif d'expédition en dépend.
										disabled={lockDestination}
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
						onDynamic: ({ value }: { value: string }) => {
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
					onDynamic: ({ value }: { value: string }) => {
						if (!value) return "Le pays est requis";
						return undefined;
					},
				}}
			>
				{(field) => (
					<field.SelectField
						label="Pays"
						required
						// Gelé avec le montant : le tarif d'expédition en dépend.
						disabled={lockDestination}
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
							onDynamic: ({ value }: { value: string | undefined }) => {
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
