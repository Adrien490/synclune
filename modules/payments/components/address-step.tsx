"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import { AlertCircle, Info, Loader2, Lock, Mail } from "lucide-react";
import { m } from "motion/react";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
	type ShippingCountry,
} from "@/shared/constants/countries";
import Link from "next/link";
import { ActionStatus } from "@/shared/types/server-action";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { DRAFT_VERSION } from "../utils/checkout-form.utils";
import { AddressSelector } from "./address-selector";
import { DiscountCodeInput } from "./discount-code-input";
import { CheckoutStepIndicator } from "./checkout-step-indicator";
import type { UserAddress } from "@/modules/addresses/types/user-addresses.types";
import type { ValidateDiscountCodeReturn } from "@/modules/discounts/types/discount.types";
import type { useCheckoutForm } from "@/modules/payments/hooks/use-checkout-form";

type CheckoutFormApi = ReturnType<typeof useCheckoutForm>["form"];
type CheckoutAction = ReturnType<typeof useCheckoutForm>["action"];
type CheckoutFormState = ReturnType<typeof useCheckoutForm>["state"];

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
	termsAccepted: "Conditions générales de vente",
};

interface AddressStepProps {
	form: CheckoutFormApi;
	action: CheckoutAction;
	isPending: boolean;
	state: CheckoutFormState;
	isGuest: boolean;
	userEmail: string | null;
	addresses: GetUserAddressesReturn | null;
	defaultAddressId: string | null;
	appliedDiscount: NonNullable<ValidateDiscountCodeReturn["discount"]> | null;
	onDiscountApplied: (discount: NonNullable<ValidateDiscountCodeReturn["discount"]> | null) => void;
	shippingUnavailable: boolean;
	total: number;
	country: ShippingCountry;
	cart: NonNullable<GetCartReturn>;
	fadeSlide: Record<string, unknown>;
}

export function AddressStep({
	form,
	action,
	isPending,
	state,
	isGuest,
	userEmail,
	addresses,
	defaultAddressId,
	appliedDiscount,
	onDiscountApplied,
	shippingUnavailable,
	total,
	country,
	cart,
	fadeSlide,
}: AddressStepProps) {
	const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddressId);
	const [showCountrySelect, setShowCountrySelect] = useState(() => {
		const shippingValues = form.state.values.shipping as unknown as Record<string, string>;
		return (shippingValues.country ?? "") !== "FR" && (shippingValues.country ?? "") !== "";
	});
	const [showAddressLine2, setShowAddressLine2] = useState(
		!!form.state.values.shipping.addressLine2,
	);

	const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

	const handleSelectAddress = (address: UserAddress) => {
		setSelectedAddressId(address.id);
		const fullName = [address.firstName, address.lastName].filter(Boolean).join(" ");
		form.setFieldValue("shipping.fullName", fullName);
		form.setFieldValue("shipping.addressLine1", address.address1);
		form.setFieldValue("shipping.addressLine2", address.address2 ?? "");
		form.setFieldValue("shipping.city", address.city);
		form.setFieldValue("shipping.postalCode", address.postalCode);
		form.setFieldValue("shipping.country", address.country);
		form.setFieldValue("shipping.phoneNumber", address.phone);
		if (address.country && address.country !== "FR") setShowCountrySelect(true);
		if (address.address2) setShowAddressLine2(true);
	};

	return (
		<m.form
			key="address"
			{...fadeSlide}
			action={action}
			className="space-y-6"
			onSubmit={() => {
				void form.handleSubmit();
			}}
		>
			{/* Hidden inputs */}
			<input
				type="hidden"
				name="cartItems"
				value={JSON.stringify(
					cart.items.map((item) => ({
						skuId: item.sku.id,
						quantity: item.quantity,
						priceAtAdd: item.priceAtAdd,
					})),
				)}
			/>

			<form.Subscribe selector={(state) => [state.values]}>
				{([values]) => {
					const v = values as Record<string, unknown>;
					const shippingValues = v.shipping as Record<string, string> | undefined;
					return (
						<>
							<input
								type="hidden"
								name="shippingAddress"
								value={JSON.stringify({
									fullName: shippingValues?.fullName ?? "",
									addressLine1: shippingValues?.addressLine1 ?? "",
									addressLine2: shippingValues?.addressLine2 ?? "",
									city: shippingValues?.city ?? "",
									postalCode: shippingValues?.postalCode ?? "",
									country: shippingValues?.country ?? "FR",
									phoneNumber: shippingValues?.phoneNumber ?? "",
								})}
							/>
							{isGuest && <input type="hidden" name="email" value={(v.email as string) || ""} />}
							<input type="hidden" name="discountCode" value={appliedDiscount?.code ?? ""} />
						</>
					);
				}}
			</form.Subscribe>

			<fieldset disabled={isPending} className="space-y-5 disabled:opacity-60">
				<CheckoutStepIndicator currentStep={1} />

				<h2 className="font-display text-lg font-medium tracking-wide sm:text-xl">
					Adresse de livraison
				</h2>

				<p className="text-muted-foreground text-sm">
					Les champs marqués d'un <span className="text-destructive">*</span> sont obligatoires.
				</p>

				{/* Server-side error (ignore validation errors handled by field validators) */}
				{state?.status !== ActionStatus.SUCCESS &&
					state?.status !== ActionStatus.VALIDATION_ERROR &&
					state?.message && (
						<Alert variant="destructive" role="alert" aria-live="assertive">
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					)}

				{/* Error summary for screen readers */}
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

						if (fieldErrors.length === 0) return null;

						return (
							<Alert variant="destructive" role="alert" aria-live="assertive">
								<AlertCircle className="size-4" />
								<AlertTitle>
									{fieldErrors.length === 1
										? "1 erreur trouvée"
										: `${fieldErrors.length} erreurs trouvées`}
								</AlertTitle>
								<AlertDescription>
									<ul className="mt-1 space-y-1">
										{fieldErrors.map(({ name, label, message }) => (
											<li key={name}>
												<a
													href={`#${name}`}
													className="underline hover:no-underline"
													onClick={(e) => {
														e.preventDefault();
														const el = document.getElementById(name);
														if (el) {
															el.scrollIntoView({ behavior: "smooth", block: "center" });
															el.focus({ preventScroll: true });
														}
													}}
												>
													{label}
												</a>{" "}
												: {message}
											</li>
										))}
									</ul>
								</AlertDescription>
							</Alert>
						);
					}}
				</form.Subscribe>

				{/* Email (guests only) */}
				{isGuest && (
					<form.AppField
						name="email"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "L'adresse email est requise";
								if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
									return "Entrez une adresse email valide";
								}
							},
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<field.InputField
									label="Adresse email"
									type="email"
									required
									inputMode="email"
									autoComplete="email"
									enterKeyHint="next"
									spellCheck={false}
									autoCorrect="off"
									// eslint-disable-next-line jsx-a11y/no-autofocus
									autoFocus
									placeholder="votre@email.com"
								/>
								<div className="text-muted-foreground flex items-start gap-1.5 text-sm">
									<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
									<span>
										Vous avez déjà un compte ?{" "}
										<Link
											href="/connexion?callbackURL=/paiement"
											className="text-foreground font-medium underline hover:no-underline"
											onClick={() => {
												if (typeof window !== "undefined") {
													const shipping = form.state.values.shipping as unknown as
														| Record<string, string>
														| undefined;
													localStorage.setItem(
														STORAGE_KEYS.CHECKOUT_FORM_DRAFT,
														JSON.stringify({
															version: DRAFT_VERSION,
															email: (form.state.values.email as unknown as string) || "",
															shipping: {
																fullName: shipping?.fullName ?? "",
																addressLine1: shipping?.addressLine1 ?? "",
																addressLine2: shipping?.addressLine2 ?? "",
																city: shipping?.city ?? "",
																postalCode: shipping?.postalCode ?? "",
																country: shipping?.country ?? "FR",
																phoneNumber: shipping?.phoneNumber ?? "",
															},
															timestamp: Date.now(),
														}),
													);
												}
											}}
										>
											Connectez-vous
										</Link>{" "}
										pour accéder à vos adresses enregistrées
									</span>
								</div>
							</div>
						)}
					</form.AppField>
				)}

				{/* Email display for logged-in users */}
				{!isGuest && userEmail && (
					<div className="border-primary/10 bg-primary/3 flex items-center gap-2 rounded-xl border p-3.5 text-sm">
						<Mail className="text-muted-foreground h-4 w-4" />
						<span className="text-muted-foreground">Email :</span>
						<span className="font-medium">{userEmail}</span>
					</div>
				)}

				{/* Address selector for logged-in users with multiple addresses */}
				{!isGuest && addresses && addresses.length > 1 && (
					<AddressSelector
						addresses={addresses}
						selectedAddressId={selectedAddressId}
						onSelectAddress={handleSelectAddress}
					/>
				)}

				{/* Full name (Baymard: single field reduces friction) */}
				<form.AppField
					name="shipping.fullName"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value || value.trim().length < 2) {
								return "Le nom complet doit contenir au moins 2 caractères";
							}
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
							placeholder="Jean Dupont"
						/>
					)}
				</form.AppField>

				<form.AppField
					name="shipping.addressLine1"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value || value.trim().length < 5) {
								return "L'adresse doit contenir au moins 5 caractères";
							}
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Adresse"
							required
							autoComplete="address-line1"
							enterKeyHint="next"
							placeholder="12 rue des Fleurs"
						/>
					)}
				</form.AppField>

				{showAddressLine2 ? (
					<form.AppField name="shipping.addressLine2">
						{(field) => (
							<field.InputField
								label="Complément d'adresse"
								optional
								placeholder="Appartement, bâtiment, etc."
								autoComplete="address-line2"
								enterKeyHint="next"
							/>
						)}
					</form.AppField>
				) : (
					<button
						type="button"
						aria-expanded={showAddressLine2}
						className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mx-3 min-h-11 rounded-md px-3 text-left text-sm underline transition-colors hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
						onClick={() => setShowAddressLine2(true)}
					>
						+ Ajouter un complément d'adresse
					</button>
				)}

				<div className="grid grid-cols-2 gap-3 sm:gap-6">
					<form.AppField
						name="shipping.postalCode"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "Le code postal est requis";
								if (value.length < 3 || value.length > 10) {
									return "Code postal invalide";
								}
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Code postal"
								required
								inputMode="numeric"
								pattern="[0-9]*"
								autoComplete="postal-code"
								autoCorrect="off"
								enterKeyHint="next"
								placeholder="75001"
							/>
						)}
					</form.AppField>

					<form.AppField
						name="shipping.city"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value || value.trim().length < 2) {
									return "La ville est requise";
								}
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Ville"
								required
								autoComplete="address-level2"
								enterKeyHint="next"
								placeholder="Paris"
							/>
						)}
					</form.AppField>
				</div>

				{showCountrySelect ? (
					<form.AppField
						name="shipping.country"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "Le pays est requis";
							},
						}}
					>
						{(field) => (
							<field.SelectField
								label="Pays"
								required
								placeholder="Sélectionner un pays"
								options={countryOptions}
								autoComplete="country-name"
							/>
						)}
					</form.AppField>
				) : (
					<div className="flex min-h-11 items-center justify-between">
						<span className="text-sm">
							Pays : <strong>France</strong>
							<span className="text-muted-foreground ml-1">(Livraison UE disponible)</span>
						</span>
						<button
							type="button"
							aria-expanded={showCountrySelect}
							className="text-muted-foreground hover:text-foreground focus-visible:ring-ring min-h-11 rounded-md px-3 text-sm underline transition-colors hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							onClick={() => setShowCountrySelect(true)}
						>
							Modifier
						</button>
					</div>
				)}

				<form.AppField name="shipping.phoneNumber">
					{(field) => (
						<div className="space-y-2">
							<field.PhoneField
								label="Téléphone"
								required
								defaultCountry={country}
								placeholder="06 12 34 56 78"
								enterKeyHint="done"
							/>
							<p className="text-muted-foreground text-sm">
								Utilisé uniquement par le transporteur en cas de problème de livraison.
							</p>
						</div>
					)}
				</form.AppField>

				<DiscountCodeInput
					subtotal={subtotal}
					appliedDiscount={appliedDiscount}
					onDiscountApplied={onDiscountApplied}
				/>

				<form.AppField
					name="termsAccepted"
					validators={{
						onChange: ({ value }: { value: boolean }) => {
							if (!value) {
								return "Vous devez accepter les conditions générales de vente";
							}
						},
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<field.CheckboxField label="J'accepte les conditions générales de vente" required />
							<div className="text-muted-foreground ml-8 text-sm">
								Consultez nos{" "}
								<Link
									href="/cgv"
									className="text-foreground underline hover:no-underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									conditions générales de vente
								</Link>{" "}
								et notre{" "}
								<Link
									href="/confidentialite"
									className="text-foreground underline hover:no-underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									politique de confidentialité
								</Link>
							</div>
						</div>
					)}
				</form.AppField>
			</fieldset>

			{/* Baymard: lock icon on CTA reinforces perceived security for premium purchases */}
			<form.Subscribe selector={(s) => [s.canSubmit, s.values.termsAccepted]}>
				{([canSubmit, termsAccepted]) => (
					<>
						<Button
							type="submit"
							size="lg"
							className="w-full text-base shadow-md transition-shadow hover:shadow-lg"
							disabled={!canSubmit || !termsAccepted || isPending || shippingUnavailable}
							aria-busy={isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
									<span>Validation...</span>
								</>
							) : (
								<>
									<Lock className="size-4" aria-hidden="true" />
									<span>Paiement sécurisé · {formatEuro(total)}</span>
								</>
							)}
						</Button>
						{shippingUnavailable && (
							<p className="text-destructive text-center text-sm" role="alert">
								Nous ne livrons pas encore dans cette zone. Contactez-nous pour trouver une
								solution.
							</p>
						)}
					</>
				)}
			</form.Subscribe>
		</m.form>
	);
}
