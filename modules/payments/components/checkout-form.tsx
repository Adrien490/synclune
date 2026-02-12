"use client";

import { useState, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import { AlertCircle, CreditCard, Info, Loader2, Lock, Mail, MapPin, Shield } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	VisaIcon,
	MastercardIcon,
	CBIcon,
} from "@/shared/components/icons/payment-icons";
import { StripeWordmark } from "./stripe-wordmark";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
	type ShippingCountry,
} from "@/shared/constants/countries";
import Link from "next/link";
import { useCheckoutForm } from "../hooks/use-checkout-form";
import { ActionStatus } from "@/shared/types/server-action";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { EmbeddedCheckoutWrapper } from "./embedded-checkout";
import { AddressSummary, type SubmittedAddress } from "./address-summary";
import { CheckoutSummary } from "./checkout-summary";
import { DiscountCodeInput } from "./discount-code-input";
import { AddressSelector } from "./address-selector";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import type { CreateCheckoutSessionResult } from "../types/checkout.types";
import type { ValidateDiscountCodeReturn } from "@/modules/discounts/types/discount.types";
import type { UserAddress } from "@/modules/addresses/types/user-addresses.types";

// Options pour le select des pays
const countryOptions = SORTED_SHIPPING_COUNTRIES.map((code) => ({
	value: code,
	label: COUNTRY_NAMES[code],
}));

// Field name to label mapping for error summary
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

interface CheckoutFormProps {
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
}

/**
 * Formulaire de checkout complet
 * Gère le state partagé via TanStack Form entre le formulaire et le récapitulatif
 * Élimine le besoin de callbacks onCountryChange/onPostalCodeChange
 */
export function CheckoutForm({
	cart,
	session,
	addresses,
}: CheckoutFormProps) {
	const isGuest = !session;

	// State pour le paiement Stripe
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [orderInfo, setOrderInfo] = useState<{
		orderId: string;
		orderNumber: string;
	} | null>(null);
	const [submittedAddress, setSubmittedAddress] =
		useState<SubmittedAddress | null>(null);

	// State for discount code
	const [appliedDiscount, setAppliedDiscount] = useState<
		NonNullable<ValidateDiscountCodeReturn["discount"]> | null
	>(null);

	// State for address selector
	const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0] ?? null;
	const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
		defaultAddress?.id ?? null
	);

	// Ref for focus management
	const headingRef = useRef<HTMLHeadingElement>(null);

	// Référence pour capturer les valeurs du formulaire avant soumission
	const formValuesRef = useRef<{
		email?: string;
		shipping?: {
			fullName: string;
			addressLine1: string;
			addressLine2?: string;
			city: string;
			postalCode: string;
			country: string;
			phoneNumber: string;
		};
	} | null>(null);

	const handleSuccess = (data: CreateCheckoutSessionResult) => {
		setClientSecret(data.clientSecret);
		setOrderInfo({ orderId: data.orderId, orderNumber: data.orderNumber });

		// Capturer l'adresse soumise pour l'afficher dans le résumé
		if (formValuesRef.current?.shipping) {
			const shipping = formValuesRef.current.shipping;
			setSubmittedAddress({
				fullName: shipping.fullName,
				addressLine1: shipping.addressLine1,
				addressLine2: shipping.addressLine2 || undefined,
				city: shipping.city,
				postalCode: shipping.postalCode,
				country: (shipping.country || "FR") as ShippingCountry,
				phoneNumber: shipping.phoneNumber,
				email: isGuest ? formValuesRef.current.email : undefined,
			});
		}

		// Scroll to top and focus the heading for screen readers
		window.scrollTo({ top: 0, behavior: "smooth" });
		requestAnimationFrame(() => headingRef.current?.focus());
	};

	const handleEdit = () => {
		setClientSecret(null);
		// Focus first form field after transition
		requestAnimationFrame(() => {
			const firstInput = document.querySelector<HTMLInputElement>(
				'input[name="email"], input[name="shipping.fullName"]'
			);
			firstInput?.focus();
		});
	};

	const handleSelectAddress = (address: UserAddress) => {
		setSelectedAddressId(address.id);
		const fullName = [address.firstName, address.lastName].filter(Boolean).join(" ");
		form.setFieldValue("shipping.fullName", fullName);
		form.setFieldValue("shipping.addressLine1", address.address1 ?? "");
		form.setFieldValue("shipping.addressLine2", address.address2 ?? "");
		form.setFieldValue("shipping.city", address.city ?? "");
		form.setFieldValue("shipping.postalCode", address.postalCode ?? "");
		form.setFieldValue("shipping.country", address.country ?? "FR");
		form.setFieldValue("shipping.phoneNumber", address.phone ?? "");
		// Show progressive disclosure fields if needed
		if (address.country && address.country !== "FR") setShowCountrySelect(true);
		if (address.address2) setShowAddressLine2(true);
	};

	// Form hook
	const { form, action, isPending, state } = useCheckoutForm({
		session,
		addresses,
		onSuccess: handleSuccess,
	});

	// Lecture directe depuis TanStack Form - plus besoin de callbacks
	const country = (form.state.values.shipping?.country ?? "FR") as ShippingCountry;
	const postalCode = form.state.values.shipping?.postalCode ?? "";

	// Progressive disclosure states
	const initialCountry = form.state.values.shipping?.country;
	const [showCountrySelect, setShowCountrySelect] = useState(
		initialCountry !== undefined && initialCountry !== "FR"
	);
	const [showAddressLine2, setShowAddressLine2] = useState(
		!!form.state.values.shipping?.addressLine2
	);

	// Calculer le total
	const subtotal = cart.items.reduce((sum, item) => {
		return sum + item.priceAtAdd * item.quantity;
	}, 0);
	const shipping = calculateShipping(country, postalCode);
	const discountAmount = appliedDiscount?.discountAmount ?? 0;
	const total = subtotal - discountAmount + shipping;

	const fadeSlide = {
		initial: { opacity: 0, y: 10 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -10 },
		transition: { duration: 0.25 },
	};

	return (
		<div className="grid lg:grid-cols-3 gap-8">
			{/* Formulaire / Paiement - 2/3 de la largeur */}
			<div className="lg:col-span-2">
				{/* Accessible heading for focus management */}
				<h1 ref={headingRef} tabIndex={-1} className="sr-only">
					Paiement sécurisé
				</h1>
				<ErrorBoundary
					errorMessage="Impossible de charger le formulaire"
					className="p-8 rounded-lg border bg-muted/50"
				>
					<AnimatePresence mode="wait">
					{clientSecret && submittedAddress ? (
						<motion.div key="payment" className="space-y-6" {...fadeSlide}>
							{/* Résumé de l'adresse de livraison (Baymard: toujours visible) */}
							<AddressSummary address={submittedAddress} onEdit={handleEdit} />

							{/* En-tête paiement */}
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
										2
									</div>
									<h2 className="text-lg font-semibold flex items-center gap-2">
										<CreditCard className="w-5 h-5" />
										Paiement sécurisé
									</h2>
								</div>
								<p className="text-sm text-muted-foreground pl-8">
									Finalise ta commande avec Stripe, leader de la sécurité des
									paiements en ligne.
								</p>
							</div>

							{/* Icônes cartes bancaires acceptées (Baymard: +11% confiance) */}
							<div className="flex items-center justify-center gap-3">
								<span className="text-xs text-muted-foreground">Cartes acceptées</span>
								<div className="flex items-center gap-2">
									<VisaIcon className="h-5 w-auto" />
									<MastercardIcon className="h-5 w-auto" />
									<CBIcon className="h-5 w-auto" />
								</div>
							</div>

							{/* Zone paiement sécurisée - fond distinct (Baymard: +37% confiance perçue) */}
							<div className="rounded-xl border-2 border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20 overflow-hidden shadow-sm">
								{/* Bandeau sécurité */}
								<div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-100/80 dark:bg-green-900/30 border-b border-green-200 dark:border-green-900">
									<Lock className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
									<span className="text-xs font-medium text-green-700 dark:text-green-400">
										Zone de paiement sécurisée
									</span>
								</div>

								{/* Formulaire Stripe Embedded */}
								<div className="bg-background">
									<EmbeddedCheckoutWrapper clientSecret={clientSecret} />
								</div>
							</div>

							{/* Message sécurité + Logo Stripe */}
							<div className="space-y-3">
								<div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
									<Shield className="w-4 h-4 mt-0.5 shrink-0" />
									<p>
										Tes informations de paiement sont protégées par le chiffrement SSL
										et 3D Secure. Je n'enregistre jamais tes coordonnées bancaires.
									</p>
								</div>

								{/* Powered by Stripe (Baymard: badge tiers reconnu) */}
								<div className="flex items-center justify-center gap-2 text-muted-foreground">
									<span className="text-xs">Propulsé par</span>
									<StripeWordmark className="h-5 w-auto opacity-60" />
								</div>
							</div>

							{/* Info commande */}
							{orderInfo && (
								<p className="text-xs text-muted-foreground text-center">
									Commande n°{orderInfo.orderNumber}
								</p>
							)}
						</motion.div>
					) : (
						<motion.form
							key="address"
							{...fadeSlide}
							action={action}
							className="space-y-5 sm:space-y-6"
							onSubmit={() => {
								// Capturer les valeurs avant soumission pour le résumé
								formValuesRef.current = {
									email: form.state.values.email as string | undefined,
									shipping: form.state.values.shipping as {
										fullName: string;
										addressLine1: string;
										addressLine2?: string;
										city: string;
										postalCode: string;
										country: string;
										phoneNumber: string;
									},
								};
								void form.handleSubmit();
							}}
						>
							{/* Step 1 indicator */}
							<div className="flex items-center gap-2">
								<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
									1
								</div>
								<h2 className="text-lg font-semibold flex items-center gap-2">
									<MapPin className="w-5 h-5" />
									Adresse de livraison
								</h2>
							</div>

							{/* Légende champs obligatoires (Baymard: 94% des sites échouent à clarifier) */}
							<p className="text-sm text-muted-foreground">
								Les champs marqués d'un <span className="text-destructive">*</span> sont
								obligatoires.
							</p>

							{/* Champs cachés */}
							<input
								type="hidden"
								name="cartItems"
								value={JSON.stringify(
									cart.items.map((item) => ({
										skuId: item.sku.id,
										quantity: item.quantity,
										priceAtAdd: item.priceAtAdd,
									}))
								)}
							/>

							<form.Subscribe selector={(state) => [state.values]}>
								{([values]) => {
									const v = values as Record<string, unknown>;
									const shippingValues = v?.shipping as
										| Record<string, string>
										| undefined;
									return (
										<>
											<input
												type="hidden"
												name="shippingAddress"
												value={JSON.stringify({
													fullName: shippingValues?.fullName || "",
													addressLine1: shippingValues?.addressLine1 || "",
													addressLine2: shippingValues?.addressLine2 || "",
													city: shippingValues?.city || "",
													postalCode: shippingValues?.postalCode || "",
													country: shippingValues?.country || "FR",
													phoneNumber: shippingValues?.phoneNumber || "",
												})}
											/>
											{isGuest && (
												<input
													type="hidden"
													name="email"
													value={(v?.email as string) || ""}
												/>
											)}
											<input
												type="hidden"
												name="discountCode"
												value={appliedDiscount?.code ?? ""}
											/>
										</>
									);
								}}
							</form.Subscribe>

							{/* Message d'erreur (ignore validation errors - handled by field validators) */}
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

									const fieldErrors = Object.entries(
										fieldMeta as Record<string, { errors: string[] }>,
									)
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
																	document.getElementById(name)?.focus();
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

							{/* Email (guests uniquement) */}
							{isGuest && (
								<>
									<form.AppField
										name="email"
										validators={{
											onChange: ({ value }: { value: string }) => {
												if (!value) return "L'adresse email est requise";
												if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
													return "Entre une adresse email valide";
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
													autoFocus
													placeholder="ton@email.com"
												/>
												<div className="text-sm text-muted-foreground flex items-start gap-1.5">
													<Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
													<span>
														Tu as déjà un compte ?{" "}
														<Link
															href="/connexion?callbackURL=/paiement"
															className="text-foreground underline hover:no-underline font-medium"
															onClick={() => {
																if (typeof window !== "undefined") {
																	const shipping = form.state.values.shipping as
																		| Record<string, string>
																		| undefined;
																	localStorage.setItem(
																		STORAGE_KEYS.CHECKOUT_FORM_DRAFT,
																		JSON.stringify({
																			email: form.state.values.email || "",
																			shipping: {
																				fullName: shipping?.fullName || "",
																				addressLine1: shipping?.addressLine1 || "",
																				addressLine2: shipping?.addressLine2 || "",
																				city: shipping?.city || "",
																				postalCode: shipping?.postalCode || "",
																				country: shipping?.country || "FR",
																				phoneNumber: shipping?.phoneNumber || "",
																			},
																			timestamp: Date.now(),
																		})
																	);
																}
															}}
														>
															Connecte-toi
														</Link>{" "}
														pour accéder à tes adresses enregistrées
													</span>
												</div>
											</div>
										)}
									</form.AppField>
								</>
							)}

							{/* Email affiché pour utilisateurs connectés */}
							{!isGuest && session?.user?.email && (
								<div className="flex items-center gap-2 text-sm p-3 bg-muted/50 rounded-lg">
									<Mail className="w-4 h-4 text-muted-foreground" />
									<span className="text-muted-foreground">Email :</span>
									<span className="font-medium">{session.user.email}</span>
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

							{/* Nom complet (Baymard: champ unique réduit friction) */}
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
									className="min-h-11 px-3 -mx-3 text-sm text-muted-foreground underline hover:no-underline hover:text-foreground text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
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
								<div className="flex items-center justify-between min-h-11">
									<span className="text-sm">
										Pays : <strong>France</strong>
										<span className="text-muted-foreground ml-1">
											(Livraison UE disponible)
										</span>
									</span>
									<button
										type="button"
										aria-expanded={showCountrySelect}
										className="min-h-11 px-3 text-sm text-muted-foreground underline hover:no-underline hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
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
											defaultCountry="FR"
											placeholder="06 12 34 56 78"
											enterKeyHint="done"
										/>
										<p className="text-sm text-muted-foreground">
											Utilisé uniquement par le transporteur en cas de problème de
											livraison.
										</p>
									</div>
								)}
							</form.AppField>

							{/* Code promo */}
							<DiscountCodeInput
								subtotal={subtotal}
								userId={session?.user?.id}
								email={isGuest ? (form.state.values.email as string | undefined) : session?.user?.email}
								appliedDiscount={appliedDiscount}
								onDiscountApplied={setAppliedDiscount}
							/>

							{/* CGV */}
							<form.AppField
								name="termsAccepted"
								validators={{
									onChange: ({ value }: { value: boolean }) => {
										if (!value) {
											return "Tu dois accepter les conditions générales de vente";
										}
									},
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<field.CheckboxField
											label="J'accepte les conditions générales de vente"
											required
										/>
										<div className="text-sm text-muted-foreground ml-8">
											Consultez nos{" "}
											<Link
												href="/cgv"
												className="text-foreground underline hover:no-underline"
												target="_blank"
												rel="noopener noreferrer"
											>
												conditions générales de vente
											</Link>
										</div>
									</div>
								)}
							</form.AppField>

							{/* Baymard: Cadenas sur CTA renforce la sécurité perçue pour achats premium */}
							<form.Subscribe selector={(s) => [s.canSubmit]}>
								{([canSubmit]) => (
									<Button
										type="submit"
										className="w-full"
										disabled={!canSubmit || isPending}
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
								)}
							</form.Subscribe>
						</motion.form>
					)}
					</AnimatePresence>
				</ErrorBoundary>
			</div>

			{/* Récapitulatif - 1/3 de la largeur */}
			<div className="lg:col-span-1">
				<CheckoutSummary
					cart={cart}
					selectedCountry={country}
					postalCode={postalCode}
					appliedDiscount={appliedDiscount}
				/>
			</div>
		</div>
	);
}
