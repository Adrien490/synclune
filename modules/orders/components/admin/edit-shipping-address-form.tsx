"use client";

/**
 * Formulaire d'edition de l'adresse de livraison.
 *
 * Pattern dual : utilise en dialog modal
 * (`edit-shipping-address-dialog.tsx`) ET en page inline
 * (`app/admin/ventes/commandes/[id]/adresse-livraison/page.tsx`).
 *
 * Le gate `FulfillmentStatus` (interdit si SHIPPED/DELIVERED/RETURNED) est
 * applique cote page inline (redirect notFound) ET cote Server Action
 * `updateOrderShippingAddress`. Toute modification de la regle doit etre
 * faite des deux cotes. Cf. ORD-MAP-002.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useUpdateOrderShippingAddress } from "@/modules/orders/hooks/use-update-order-shipping-address";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAppForm } from "@/shared/components/forms";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { ADDRESS_CONSTANTS, ADDRESS_ERROR_MESSAGES } from "@/shared/constants/address.constants";
import { COUNTRY_NAMES, SORTED_SHIPPING_COUNTRIES } from "@/shared/constants/countries";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/view-transition";

interface EditShippingAddressFormProps {
	orderId: string;
	orderNumber: string;
	shippingFirstName: string;
	shippingLastName: string;
	shippingAddress1: string;
	shippingAddress2?: string | null;
	shippingPostalCode: string;
	shippingCity: string;
	shippingCountry: string;
	shippingPhone?: string | null;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	successPath?: string;
	className?: string;
}

const countryOptions = SORTED_SHIPPING_COUNTRIES.map((code) => ({
	value: code as string,
	label: COUNTRY_NAMES[code],
}));

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function EditShippingAddressForm({
	orderId,
	orderNumber,
	shippingFirstName,
	shippingLastName,
	shippingAddress1,
	shippingAddress2,
	shippingPostalCode,
	shippingCity,
	shippingCountry,
	shippingPhone,
	onSuccess,
	redirectOnSuccess = false,
	successPath,
	className,
}: EditShippingAddressFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const form = useAppForm({
		defaultValues: {
			shippingFirstName,
			shippingLastName,
			shippingAddress1,
			shippingAddress2: shippingAddress2 ?? "",
			shippingPostalCode,
			shippingCity,
			shippingCountry,
			shippingPhone: shippingPhone ?? "",
		},
	});

	const { state, action, isPending } = useUpdateOrderShippingAddress(() => {
		haptic("success");
		allowNavigationRef.current?.();
		// Nouvelle baseline : les valeurs enregistrées ne sont plus « non sauvées ».
		form.reset(form.state.values);
		onSuccess?.();
		if (redirectOnSuccess && successPath) {
			navigateWithTransition(router, successPath);
		}
	});

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus du schéma serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, !isPending);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: successPath,
		allowNavigation,
		getIsDirty: () => form.state.isDirty,
		getCanSubmit: () => form.state.canSubmit,
	});

	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action,
		isPending,
		focusFirstInvalid,
		context: "EditShippingAddressForm",
	});

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire d'adresse de livraison"
			className={cn("space-y-6", className)}
			onInvalidCapture={onInvalidCapture}
			onSubmit={handleGatedSubmit}
		>
			<input type="hidden" name="id" value={orderId} />

			<p className="text-muted-foreground text-sm">
				Commande <span className="text-foreground font-semibold">{orderNumber}</span> — correction
				de l&apos;adresse de livraison. Bloqué dès que la commande passe en expédition.
			</p>

			<FormServerErrorAlert errors={serverErrors} />

			<RequiredFieldsNote />

			<fieldset disabled={isPending} className="space-y-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<form.AppField
						name="shippingFirstName"
						validators={{
							onChange: ({ value }) => {
								const trimmed = value.trim();
								if (trimmed.length < ADDRESS_CONSTANTS.MIN_NAME_LENGTH) {
									return ADDRESS_ERROR_MESSAGES.FIRST_NAME_TOO_SHORT;
								}
								if (trimmed.length > ADDRESS_CONSTANTS.MAX_NAME_LENGTH) {
									return ADDRESS_ERROR_MESSAGES.FIRST_NAME_TOO_LONG;
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Prénom"
								type="text"
								autoComplete="given-name"
								autoCapitalize="words"
								enterKeyHint="next"
								required
								maxLength={ADDRESS_CONSTANTS.MAX_NAME_LENGTH}
							/>
						)}
					</form.AppField>
					<form.AppField
						name="shippingLastName"
						validators={{
							onChange: ({ value }) => {
								const trimmed = value.trim();
								if (trimmed.length < ADDRESS_CONSTANTS.MIN_NAME_LENGTH) {
									return ADDRESS_ERROR_MESSAGES.LAST_NAME_TOO_SHORT;
								}
								if (trimmed.length > ADDRESS_CONSTANTS.MAX_NAME_LENGTH) {
									return ADDRESS_ERROR_MESSAGES.LAST_NAME_TOO_LONG;
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Nom"
								type="text"
								autoComplete="family-name"
								autoCapitalize="words"
								enterKeyHint="next"
								required
								maxLength={ADDRESS_CONSTANTS.MAX_NAME_LENGTH}
							/>
						)}
					</form.AppField>
				</div>

				<form.AppField
					name="shippingAddress1"
					validators={{
						onChange: ({ value }) => {
							const trimmed = value.trim();
							if (trimmed.length === 0) {
								return "L'adresse est requise";
							}
							if (trimmed.length > ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH) {
								return ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_LONG;
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Adresse"
							type="text"
							autoComplete="address-line1"
							autoCapitalize="words"
							enterKeyHint="next"
							required
							maxLength={ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH}
						/>
					)}
				</form.AppField>

				<form.AppField
					name="shippingAddress2"
					validators={{
						onChange: ({ value }) =>
							value.trim().length > ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH
								? ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_LONG
								: undefined,
					}}
				>
					{(field) => (
						<field.InputField
							label="Complément d'adresse"
							type="text"
							autoComplete="address-line2"
							autoCapitalize="sentences"
							enterKeyHint="next"
							maxLength={ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH}
						/>
					)}
				</form.AppField>

				<div className="grid grid-cols-3 gap-4">
					<form.AppField
						name="shippingPostalCode"
						validators={{
							onChange: ({ value }) => {
								if (!value.trim()) {
									return "Le code postal est requis";
								}
								// Même regex que le serveur (`postalCodeSchema`), importée de la SSOT.
								if (
									value.length > ADDRESS_CONSTANTS.MAX_POSTAL_CODE_LENGTH ||
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
								type="text"
								inputMode="numeric"
								autoComplete="postal-code"
								autoCorrect="off"
								spellCheck={false}
								enterKeyHint="next"
								required
								maxLength={ADDRESS_CONSTANTS.MAX_POSTAL_CODE_LENGTH}
							/>
						)}
					</form.AppField>
					<div className="col-span-2">
						<form.AppField
							name="shippingCity"
							validators={{
								onChange: ({ value }) => {
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
									type="text"
									autoComplete="address-level2"
									autoCapitalize="words"
									enterKeyHint="next"
									required
									maxLength={ADDRESS_CONSTANTS.MAX_CITY_LENGTH}
								/>
							)}
						</form.AppField>
					</div>
				</div>

				<form.AppField name="shippingCountry">
					{(field) => (
						<field.SelectField
							label="Pays"
							placeholder="Sélectionner un pays"
							options={countryOptions}
							disabled={isPending}
							required
							autoComplete="country"
						/>
					)}
				</form.AppField>

				{/* Seul champ éditable portant le téléphone du client depuis le retrait
				    de `Order.customerPhone` (2026-08-04). C'est le numéro transmis au
				    transporteur : une faute de frappe doit rester corrigeable. */}
				<form.AppField name="shippingPhone">
					{(field) => (
						<field.InputField
							label="Téléphone"
							optional
							type="tel"
							inputMode="tel"
							autoComplete="tel"
							autoCorrect="off"
							spellCheck={false}
							enterKeyHint="done"
							maxLength={20}
							placeholder="06 12 34 56 78"
						/>
					)}
				</form.AppField>
			</fieldset>

			<form.AppForm>
				<AdminFormFooter pending={isPending}>
					<div className="flex justify-end">
						<form.SubmitButton
							isPending={isPending}
							idleLabel="Enregistrer l'adresse"
							pendingLabel="Mise à jour…"
							showKbdHint
							className="w-full sm:w-auto sm:min-w-56"
						/>
					</div>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
