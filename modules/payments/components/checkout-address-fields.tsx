"use client";

import type { CheckoutFormInstance } from "../hooks/use-checkout-form";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
	NUMERIC_POSTAL_CODE_COUNTRIES,
	type ShippingCountry,
} from "@/shared/constants/countries";
import { useAddressAutocomplete } from "../hooks/use-address-autocomplete";
import type { SearchAddressResult } from "@/modules/addresses/types/search-address.types";
import { isValidPhoneNumber } from "libphonenumber-js";
import { PHONE_ERROR_MESSAGES } from "@/shared/schemas/phone.schemas";
import { ADDRESS_CONSTANTS, ADDRESS_ERROR_MESSAGES } from "@/shared/constants/address.constants";
import { parseFullName } from "../utils/parse-full-name";

// Bornes tirées de la SSOT d'adresse — jamais réécrites à la main ici : c'est cette
// duplication qui avait laissé le client accepter des saisies que le serveur refuse.
const { MAX_FULL_NAME_LENGTH, MAX_POSTAL_CODE_LENGTH } = ADDRESS_CONSTANTS;

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
					if (value.trim().length > ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH) {
						return ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_LONG;
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
	lockDestination = false,
}: CheckoutAddressFieldsProps) {
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

			{/* Full name */}
			<form.AppField
				name="shipping.fullName"
				validators={{
					// Miroir exact des 3 étages d'`addressSchema.fullName` (longueur totale,
					// longueur de chaque partie, nom de famille non vide). Le validateur ne
					// posait que le minimum de 2 : une saisie trop longue ou sans nom de
					// famille n'affichait AUCUNE erreur de champ, et le refus remontait
					// ensuite dans le bandeau global de `confirmCheckout` — donc sans dire
					// quel champ corriger.
					onDynamic: ({ value }: { value: string }) => {
						const trimmed = value.trim();
						if (trimmed.length < 2) {
							return "Le nom complet doit contenir au moins 2 caractères";
						}
						if (trimmed.length > MAX_FULL_NAME_LENGTH) {
							return `Le nom complet ne peut pas dépasser ${MAX_FULL_NAME_LENGTH} caractères`;
						}
						const { firstName, lastName } = parseFullName(trimmed);
						if (
							firstName.length > ADDRESS_CONSTANTS.MAX_NAME_LENGTH ||
							lastName.length > ADDRESS_CONSTANTS.MAX_NAME_LENGTH
						) {
							return `Le prénom et le nom ne peuvent pas dépasser ${ADDRESS_CONSTANTS.MAX_NAME_LENGTH} caractères chacun`;
						}
						if (lastName.length === 0) {
							return "Indique ton prénom et ton nom (ex : Léane Dupont)";
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
						maxLength={MAX_FULL_NAME_LENGTH}
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

			<form.AppField
				name="shipping.addressLine2"
				validators={{
					// Le seul champ d'adresse qui n'avait AUCUN validateur : optionnel côté
					// schéma, mais borné à 255 comme `addressLine1`.
					onDynamic: ({ value }: { value: string | undefined }) =>
						(value?.trim().length ?? 0) > ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH
							? ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_LONG
							: undefined,
				}}
			>
				{(field) => (
					<field.InputField
						label="Complément d'adresse"
						optional
						autoComplete="address-line2"
						autoCapitalize="sentences"
						enterKeyHint="next"
						maxLength={ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH}
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
										// ⚠️ Le validateur ne contrôlait QUE la longueur (3–10), alors
										// que le serveur exige `POSTAL_CODE_REGEX` — qui demande au
										// minimum 4 caractères. Un code postal de 3 caractères ne
										// déclenchait donc aucune erreur de champ, puis se faisait
										// refuser par `confirmCheckout` dans le bandeau global.
										// Même regex des deux côtés, importée de la SSOT.
										if (
											value.length > MAX_POSTAL_CODE_LENGTH ||
											!ADDRESS_CONSTANTS.POSTAL_CODE_REGEX.test(value.trim())
										) {
											return ADDRESS_ERROR_MESSAGES.INVALID_POSTAL_CODE;
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
										spellCheck={false}
										enterKeyHint="next"
										// Aligné sur la borne haute du validateur — sans ça le champ
										// accepte une saisie que la validation rejettera.
										maxLength={MAX_POSTAL_CODE_LENGTH}
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
							const trimmed = value.trim();
							if (trimmed.length < ADDRESS_CONSTANTS.MIN_CITY_LENGTH) {
								return "La ville est requise";
							}
							if (trimmed.length > ADDRESS_CONSTANTS.MAX_CITY_LENGTH) {
								return ADDRESS_ERROR_MESSAGES.CITY_TOO_LONG;
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
							maxLength={ADDRESS_CONSTANTS.MAX_CITY_LENGTH}
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
		</fieldset>
	);
}
