"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping, getShippingInfo } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import {
	AlertCircle,
	Check,
	ChevronRight,
	Info,
	Loader2,
	Lock,
	Mail,
	WifiOff,
	X,
} from "lucide-react";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
	type ShippingCountry,
} from "@/shared/constants/countries";
import Link from "next/link";
import { useCheckoutForm } from "../hooks/use-checkout-form";
import { usePaymentIntent } from "../hooks/use-payment-intent";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import type {
	AppliedDiscount,
	ValidateDiscountCodeReturn,
} from "@/modules/discounts/types/discount.types";
import { CheckoutSummary } from "./checkout-summary";
import { CheckoutSection } from "./checkout-section";
import { ShippingMethodSection } from "./shipping-method-section";
import { PayButton } from "./pay-button";
import { AddressSelector } from "./address-selector";
import { StripeWordmark } from "./stripe-wordmark";
import type { UserAddress } from "@/modules/addresses/types/user-addresses.types";
import { validateDiscountCode } from "@/modules/discounts/actions/validate-discount-code";
import { Button } from "@/shared/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { cn } from "@/shared/utils/cn";
import { getStripe } from "@/shared/lib/stripe-client";
import { stripeAppearance } from "../constants/stripe-appearance";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";
import { PaymentElement } from "@stripe/react-stripe-js";

// Offline detection via useSyncExternalStore for SSR safety
function subscribeOnline(callback: () => void) {
	window.addEventListener("online", callback);
	window.addEventListener("offline", callback);
	return () => {
		window.removeEventListener("online", callback);
		window.removeEventListener("offline", callback);
	};
}
function getOnlineSnapshot() {
	return navigator.onLine;
}
function getServerSnapshot() {
	return true;
}

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

interface CheckoutFormProps {
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
}

/**
 * Single-page checkout form (Shopify-style).
 *
 * Sections: Contact, Livraison, Mode d'expédition, Code promo, Paiement.
 * Card-only payment via Stripe PaymentElement.
 */
export function CheckoutForm({ cart, session, addresses }: CheckoutFormProps) {
	const isGuest = !session;
	const headingRef = useRef<HTMLHeadingElement>(null);
	const [isPaymentReady, setIsPaymentReady] = useState(false);

	const { form } = useCheckoutForm({ session, addresses });

	const cartItems = cart.items.map((item) => ({
		skuId: item.sku.id,
		quantity: item.quantity,
		priceAtAdd: item.priceAtAdd,
	}));

	const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

	const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);

	// Initialize Payment Intent
	const pi = usePaymentIntent({
		cartItems,
		email: isGuest ? undefined : session.user.email || undefined,
	});

	function handleSelectAddress(address: UserAddress) {
		form.setFieldValue("_selectedAddressId", address.id);
		const fullName = [address.firstName, address.lastName].filter(Boolean).join(" ");
		form.setFieldValue("shipping.fullName", fullName);
		form.setFieldValue("shipping.addressLine1", address.address1);
		form.setFieldValue("shipping.addressLine2", address.address2 ?? "");
		form.setFieldValue("shipping.city", address.city);
		form.setFieldValue("shipping.postalCode", address.postalCode);
		form.setFieldValue("shipping.country", address.country);
		form.setFieldValue("shipping.phoneNumber", address.phone);
	}

	/**
	 * Builds ConfirmCheckoutData from the current form state.
	 * Called by PayButton before submission.
	 * Returns null if validation fails (triggers form errors).
	 * Validates unapplied discount codes before submission.
	 */
	async function getFormData(): Promise<ConfirmCheckoutData | null> {
		const values = form.state.values;
		const s = values.shipping;

		// Trigger full form validation + increment submissionAttempts
		await form.handleSubmit();

		if (!form.state.canSubmit) {
			// Scroll to error summary after render
			requestAnimationFrame(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				if (errorAlert) {
					errorAlert.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			});
			return null;
		}

		let appliedDiscount = values._appliedDiscount as AppliedDiscount | null;
		const rawDiscountCode = (values.discountCode as string).trim().toUpperCase();

		// If there's an unapplied discount code, validate it before submission
		if (!appliedDiscount && rawDiscountCode) {
			const result = await validateDiscountCode(rawDiscountCode, subtotal);
			if (result.valid && result.discount) {
				appliedDiscount = result.discount;
				form.setFieldValue("_appliedDiscount", result.discount);
				form.setFieldValue("discountCode", "");
			} else {
				// Open the discount section and show the error
				form.setFieldValue("_discountOpen", true);
				form.setFieldMeta("discountCode", (prev) => ({
					...prev,
					errors: [result.error ?? "Code invalide"],
				}));
				return null;
			}
		}

		const discountCode = appliedDiscount?.code ?? undefined;

		return {
			cartItems,
			shippingAddress: {
				fullName: s.fullName,
				addressLine1: s.addressLine1,
				addressLine2: s.addressLine2 || undefined,
				city: s.city,
				postalCode: s.postalCode,
				country: ((s.country as string) || "FR") as ShippingCountry,
				phoneNumber: s.phoneNumber,
			},
			email: isGuest ? (values.email as string) || undefined : undefined,
			discountCode,
			paymentIntentId: pi.paymentIntentId!,
			newsletterOptIn: values.newsletterOptIn,
			saveInfo: values.saveInfo,
		};
	}

	return (
		<form.Subscribe
			selector={(s) => ({
				country: s.values.shipping.country,
				postalCode: s.values.shipping.postalCode,
				appliedDiscount: s.values._appliedDiscount,
			})}
		>
			{({ country: rawCountry, postalCode, appliedDiscount }) => {
				const country = ((rawCountry as string) || "FR") as ShippingCountry;
				const shippingRaw = calculateShipping(country, postalCode as string);
				const shippingUnavailable = shippingRaw === null;
				const shipping = shippingRaw ?? 0;
				const discountAmount = (appliedDiscount as AppliedDiscount | null)?.discountAmount ?? 0;
				const total = subtotal - discountAmount + shipping;
				const shippingInfo = getShippingInfo(country, postalCode as string);

				return (
					<div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
						<div className="space-y-8">
							<h1 ref={headingRef} tabIndex={-1} className="sr-only">
								Paiement sécurisé
							</h1>

							{!isOnline && (
								<Alert variant="destructive" role="alert" aria-live="assertive">
									<WifiOff className="size-4" />
									<AlertTitle>Connexion internet perdue</AlertTitle>
									<AlertDescription>
										Vérifiez votre connexion internet avant de continuer. Le paiement nécessite une
										connexion active.
									</AlertDescription>
								</Alert>
							)}

							{pi.error && (
								<Alert variant="destructive" role="alert">
									<AlertCircle className="size-4" />
									<AlertDescription>{pi.error}</AlertDescription>
								</Alert>
							)}

							<ErrorBoundary
								errorMessage="Impossible de charger le formulaire"
								className="bg-muted/50 rounded-lg border p-8"
							>
								<div className="space-y-8">
									{/* === SECTION 1: Contact === */}
									<CheckoutSection title="Contact">
										<div className="space-y-5">
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
															return undefined;
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
															/>
															<div className="text-muted-foreground flex items-start gap-1.5 text-sm">
																<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
																<span>
																	Vous avez déjà un compte ?{" "}
																	<Link
																		href="/connexion?callbackURL=/paiement"
																		className="text-foreground font-medium underline hover:no-underline"
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
											{!isGuest && session.user.email && (
												<div className="border-primary/10 bg-primary/3 flex items-center gap-2 rounded-xl border p-3.5 text-sm">
													<Mail className="text-muted-foreground h-4 w-4" />
													<span className="text-muted-foreground">Email :</span>
													<span className="font-medium">{session.user.email}</span>
												</div>
											)}

											{/* Newsletter opt-in */}
											<form.AppField name="newsletterOptIn">
												{(field) => (
													<field.CheckboxField label="Je souhaite recevoir les offres et nouveautés par email" />
												)}
											</form.AppField>
										</div>
									</CheckoutSection>

									{/* === SECTION 2: Shipping Address === */}
									<CheckoutSection title="Livraison">
										<fieldset className="space-y-5">
											<p className="text-muted-foreground text-sm">
												Les champs marqués d'un <span className="text-destructive">*</span> sont
												obligatoires.
											</p>

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
																					const el = document.getElementById(name);
																					if (el) {
																						el.scrollIntoView({
																							behavior: "smooth",
																							block: "center",
																						});
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

											{/* Address selector for logged-in users with multiple addresses */}
											{!isGuest && addresses && addresses.length > 1 && (
												<form.Subscribe selector={(s) => s.values._selectedAddressId}>
													{(selectedAddressId) => (
														<AddressSelector
															addresses={addresses}
															selectedAddressId={selectedAddressId}
															onSelectAddress={handleSelectAddress}
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
														return undefined;
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

											<div className="grid grid-cols-2 gap-3 sm:gap-6">
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
															placeholder="Paris"
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
																	placeholder="06 12 34 56 78"
																	enterKeyHint="done"
																/>
																<p className="text-muted-foreground text-sm">
																	Utilisé uniquement par le transporteur en cas de problème de
																	livraison.
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
									</CheckoutSection>

									{/* === SECTION 3: Shipping Method === */}
									<CheckoutSection title="Mode d'expédition">
										<ShippingMethodSection
											shipping={shipping}
											shippingUnavailable={shippingUnavailable}
											shippingInfo={shippingInfo}
										/>
									</CheckoutSection>

									{/* === SECTION 4: Discount Code === */}
									<form.Subscribe selector={(s) => s.values._appliedDiscount}>
										{(appliedDiscount) => {
											if (appliedDiscount) {
												return (
													<div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2.5">
														<div className="flex min-w-0 items-center gap-2">
															<Check
																className="h-4 w-4 shrink-0 text-green-600"
																aria-hidden="true"
															/>
															<span className="truncate text-sm font-medium text-green-700">
																{appliedDiscount.code}
															</span>
															<span className="text-sm text-green-600">
																-{formatEuro(appliedDiscount.discountAmount)}
															</span>
														</div>
														<button
															type="button"
															onClick={() => {
																form.setFieldValue("_appliedDiscount", null);
																form.setFieldValue("discountCode", "");
															}}
															className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm p-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
															aria-label="Supprimer le code promo"
														>
															<X className="h-4 w-4" />
														</button>
													</div>
												);
											}

											return (
												<form.Subscribe selector={(s) => s.values._discountOpen}>
													{(isOpen) => (
														<Collapsible
															open={isOpen}
															onOpenChange={(v) => form.setFieldValue("_discountOpen", v)}
														>
															<CollapsibleTrigger className="text-muted-foreground hover:text-foreground -mx-3 inline-flex min-h-11 items-center gap-1 px-3 text-sm transition-colors">
																<ChevronRight
																	className={cn(
																		"h-3.5 w-3.5 transition-transform",
																		isOpen && "rotate-90",
																	)}
																/>
																J'ai un code promo
															</CollapsibleTrigger>
															<CollapsibleContent>
																<div className="space-y-2 pt-1">
																	<form.AppField
																		name="discountCode"
																		validators={{
																			onBlurAsync: async ({ value, fieldApi }) => {
																				const code = (value as string).trim().toUpperCase();
																				if (!code) return undefined;
																				const result = await validateDiscountCode(code, subtotal);
																				if (result.valid && result.discount) {
																					fieldApi.form.setFieldValue(
																						"_appliedDiscount",
																						result.discount,
																					);
																					fieldApi.form.setFieldValue("discountCode", "");
																					return undefined;
																				}
																				return result.error ?? "Code invalide";
																			},
																		}}
																	>
																		{(field) => (
																			<div className="flex gap-2">
																				<field.InputField
																					placeholder="Entrer un code"
																					className="uppercase"
																					aria-label="Code promo"
																					onKeyDown={(e: React.KeyboardEvent) => {
																						if (e.key === "Enter") {
																							e.preventDefault();
																							field.handleBlur();
																						}
																					}}
																				/>
																				<Button
																					type="button"
																					variant="outline"
																					disabled={
																						field.state.meta.isValidating ||
																						!(field.state.value as string).trim()
																					}
																					onClick={() => field.handleBlur()}
																				>
																					{field.state.meta.isValidating ? (
																						<Loader2 className="h-4 w-4 motion-safe:animate-spin" />
																					) : (
																						"Appliquer"
																					)}
																				</Button>
																			</div>
																		)}
																	</form.AppField>
																</div>
															</CollapsibleContent>
														</Collapsible>
													)}
												</form.Subscribe>
											);
										}}
									</form.Subscribe>

									{/* === SECTION 5: Payment === */}
									<CheckoutSection title="Paiement">
										{pi.isLoading ? (
											<div
												className="animate-pulse space-y-4 rounded-xl border p-6"
												aria-busy="true"
												role="status"
											>
												<span className="sr-only">Chargement du formulaire de paiement…</span>
												<div className="bg-muted h-4 w-40 rounded" />
												<div className="bg-muted h-10 w-full rounded" />
												<div className="grid grid-cols-2 gap-4">
													<div className="bg-muted h-10 rounded" />
													<div className="bg-muted h-10 rounded" />
												</div>
											</div>
										) : pi.clientSecret ? (
											<Elements
												stripe={getStripe()}
												options={{
													clientSecret: pi.clientSecret,
													appearance: stripeAppearance,
													locale: "fr",
												}}
											>
												<div className="space-y-6">
													<p className="text-muted-foreground text-sm">
														Toutes les transactions sont sécurisées et chiffrées.
													</p>

													{!isPaymentReady && (
														<div className="animate-pulse space-y-4" aria-busy="true" role="status">
															<span className="sr-only">Chargement du formulaire de paiement…</span>
															<div className="bg-muted h-4 w-40 rounded" />
															<div className="bg-muted h-10 w-full rounded" />
															<div className="grid grid-cols-2 gap-4">
																<div className="bg-muted h-10 rounded" />
																<div className="bg-muted h-10 rounded" />
															</div>
														</div>
													)}
													<div
														className={cn(
															"bg-card border-primary/10 overflow-hidden rounded-2xl border p-4 shadow-sm",
															!isPaymentReady && "hidden",
														)}
													>
														<PaymentElement onReady={() => setIsPaymentReady(true)} />
													</div>

													{/* Terms notice + Pay button */}
													<div className="space-y-3">
														<p className="text-muted-foreground text-center text-xs">
															En passant commande, vous acceptez nos{" "}
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
															.
														</p>
														<form.Subscribe
															selector={(s) => ({
																canSubmit: s.canSubmit,
																email: s.values.email,
																billingName: s.values.shipping.fullName,
															})}
														>
															{({ canSubmit, email, billingName }) => (
																<PayButton
																	total={total}
																	disabled={!canSubmit}
																	shippingUnavailable={shippingUnavailable}
																	email={
																		isGuest
																			? (email as string) || undefined
																			: session.user.email || undefined
																	}
																	billingName={(billingName as string) || undefined}
																	getFormData={getFormData}
																/>
															)}
														</form.Subscribe>
													</div>

													{/* Trust badges */}
													<div className="border-primary/5 bg-primary/2 rounded-xl border p-4">
														<div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
															<span className="inline-flex items-center gap-1">
																<Lock className="h-3 w-3" />
																Paiement sécurisé
															</span>
															<span aria-hidden="true" className="text-border hidden sm:inline">
																|
															</span>
															<span className="inline-flex items-center gap-1">
																Propulsé par <StripeWordmark className="h-4 w-auto opacity-50" />
															</span>
														</div>
													</div>
												</div>
											</Elements>
										) : null}
									</CheckoutSection>
								</div>
							</ErrorBoundary>
						</div>

						<div className="order-first lg:order-0">
							<CheckoutSummary
								cart={cart}
								subtotal={subtotal}
								shipping={shipping}
								shippingUnavailable={shippingUnavailable}
								shippingInfo={shippingInfo}
								total={total}
								discountAmount={discountAmount}
								appliedDiscount={
									appliedDiscount as NonNullable<ValidateDiscountCodeReturn["discount"]> | null
								}
							/>
						</div>
					</div>
				);
			}}
		</form.Subscribe>
	);
}
