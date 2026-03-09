"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
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
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { AnimatePresence, useReducedMotion, m } from "motion/react";
import {
	SORTED_SHIPPING_COUNTRIES,
	COUNTRY_NAMES,
	type ShippingCountry,
} from "@/shared/constants/countries";
import Link from "next/link";
import { ActionStatus } from "@/shared/types/server-action";
import { useCheckoutForm } from "../hooks/use-checkout-form";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import type { CreateCheckoutSessionResult } from "../types/checkout.types";
import type {
	AppliedDiscount,
	ValidateDiscountCodeReturn,
} from "@/modules/discounts/types/discount.types";
import { CheckoutSummary } from "./checkout-summary";
import { AddressSelector } from "./address-selector";
import { CheckoutStepIndicator } from "./checkout-step-indicator";
import { PaymentStep } from "./payment-step";
import type { SubmittedAddress } from "./address-summary";
import type { UserAddress } from "@/modules/addresses/types/user-addresses.types";
import { validateDiscountCode } from "@/modules/discounts/actions/validate-discount-code";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { cn } from "@/shared/utils/cn";

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
	termsAccepted: "Conditions générales de vente",
};

interface CheckoutFormProps {
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
}

/**
 * Checkout orchestration component.
 *
 * Manages shared state (discount, payment step, submitted address) and
 * renders the address form (step 1) and PaymentStep (step 2).
 */
export function CheckoutForm({ cart, session, addresses }: CheckoutFormProps) {
	const isGuest = !session;

	const [checkoutResult, setCheckoutResult] = useState<{
		clientSecret: string;
		orderId: string;
		orderNumber: string;
		address: SubmittedAddress;
	} | null>(null);

	const headingRef = useRef<HTMLHeadingElement>(null);

	const { form, action, isPending, state } = useCheckoutForm({
		session,
		addresses,
		onSuccess: handleSuccess,
	});

	const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

	const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);
	const shouldReduceMotion = useReducedMotion();
	const fadeSlide = shouldReduceMotion
		? {}
		: {
				initial: { opacity: 0, y: 10 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 0, y: -10 },
				transition: { duration: MOTION_CONFIG.duration.normal },
			};

	function handleSuccess(data: CreateCheckoutSessionResult) {
		const s = form.state.values.shipping;
		setCheckoutResult({
			clientSecret: data.clientSecret,
			orderId: data.orderId,
			orderNumber: data.orderNumber,
			address: {
				fullName: s.fullName,
				addressLine1: s.addressLine1,
				addressLine2: s.addressLine2 || undefined,
				city: s.city,
				postalCode: s.postalCode,
				country: ((s.country as string) || "FR") as ShippingCountry,
				phoneNumber: s.phoneNumber,
				email: isGuest ? (form.state.values.email as unknown as string) || undefined : undefined,
			},
		});

		window.scrollTo({ top: 0, behavior: "smooth" });
		requestAnimationFrame(() => headingRef.current?.focus());
	}

	function handleEdit() {
		setCheckoutResult(null);
		requestAnimationFrame(() => {
			const firstInput = document.querySelector<HTMLInputElement>(
				'input[name="email"], input[name="shipping.fullName"]',
			);
			firstInput?.focus();
		});
	}

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
		if (address.country && address.country !== "FR") form.setFieldValue("_showCountrySelect", true);
		if (address.address2) form.setFieldValue("_showAddressLine2", true);
	}

	const currentStepLabel = checkoutResult
		? "Étape 2 sur 2 : Paiement"
		: "Étape 1 sur 2 : Adresse de livraison";

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
						<div className="space-y-6">
							<h1 ref={headingRef} tabIndex={-1} className="sr-only">
								Paiement sécurisé
							</h1>

							{/* Screen reader announcement for step changes */}
							<div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
								{currentStepLabel}
							</div>

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

							<ErrorBoundary
								errorMessage="Impossible de charger le formulaire"
								className="bg-muted/50 rounded-lg border p-8"
							>
								<AnimatePresence mode="wait">
									{checkoutResult ? (
										<PaymentStep
											key="payment"
											submittedAddress={checkoutResult.address}
											onEdit={handleEdit}
											clientSecret={checkoutResult.clientSecret}
											orderNumber={checkoutResult.orderNumber}
											fadeSlide={fadeSlide}
										/>
									) : (
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
													const appliedDiscount = v._appliedDiscount as { code: string } | null;
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
															{isGuest && (
																<input
																	type="hidden"
																	name="email"
																	value={(v.email as string) || ""}
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

											<fieldset disabled={isPending} className="space-y-5 disabled:opacity-60">
												<CheckoutStepIndicator currentStep={1} />

												<h2 className="font-display text-lg font-medium tracking-wide sm:text-xl">
													Adresse de livraison
												</h2>

												<p className="text-muted-foreground text-sm">
													Les champs marqués d'un <span className="text-destructive">*</span> sont
													obligatoires.
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

												{/* Full name (Baymard: single field reduces friction) */}
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

												<form.Subscribe selector={(s) => s.values._showAddressLine2}>
													{(showAddressLine2) =>
														showAddressLine2 ? (
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
																aria-expanded={false}
																className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mx-3 min-h-11 rounded-md px-3 text-left text-sm underline transition-colors hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
																onClick={() => form.setFieldValue("_showAddressLine2", true)}
															>
																+ Ajouter un complément d'adresse
															</button>
														)
													}
												</form.Subscribe>

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

												<form.Subscribe selector={(s) => s.values._showCountrySelect}>
													{(showCountrySelect) =>
														showCountrySelect ? (
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
																	<span className="text-muted-foreground ml-1">
																		(Livraison UE disponible)
																	</span>
																</span>
																<button
																	type="button"
																	aria-expanded={false}
																	className="text-muted-foreground hover:text-foreground focus-visible:ring-ring min-h-11 rounded-md px-3 text-sm underline transition-colors hover:no-underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
																	onClick={() => form.setFieldValue("_showCountrySelect", true)}
																>
																	Modifier
																</button>
															</div>
														)
													}
												</form.Subscribe>

												<form.Subscribe selector={(s) => s.values.shipping.country}>
													{(country) => (
														<form.AppField name="shipping.phoneNumber">
															{(field) => (
																<div className="space-y-2">
																	<field.PhoneField
																		label="Téléphone"
																		required
																		defaultCountry={
																			((country as string) || "FR") as ShippingCountry
																		}
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

												{/* Discount code */}
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
																							const code = (value as string)?.trim().toUpperCase();
																							if (!code) return undefined;
																							const result = await validateDiscountCode(
																								code,
																								subtotal,
																							);
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
																									!(field.state.value as string)?.trim()
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

												<form.AppField
													name="termsAccepted"
													validators={{
														onChange: ({ value }: { value: boolean }) => {
															if (!value) {
																return "Vous devez accepter les conditions générales de vente";
															}
															return undefined;
														},
													}}
												>
													{(field) => (
														<div className="space-y-2">
															<field.CheckboxField
																label="J'accepte les conditions générales de vente"
																required
															/>
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
															disabled={
																!canSubmit || !termsAccepted || isPending || shippingUnavailable
															}
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
																Nous ne livrons pas encore dans cette zone. Contactez-nous pour
																trouver une solution.
															</p>
														)}
													</>
												)}
											</form.Subscribe>
										</m.form>
									)}
								</AnimatePresence>
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
