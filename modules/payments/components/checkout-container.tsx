"use client"

import { useState } from "react"
import { CheckoutForm } from "./checkout-form"
import { EmbeddedCheckoutWrapper } from "./embedded-checkout"
import { CheckoutSummary } from "./checkout-summary"
import { Button } from "@/shared/components/ui/button"
import { ErrorBoundary } from "@/shared/components/error-boundary"
import { ArrowLeft, CreditCard, Shield, MapPin } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import type { GetCartReturn } from "@/modules/cart/data/get-cart"
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses"
import type { Session } from "@/modules/auth/lib/auth"
import type { CreateCheckoutSessionResult } from "../types/checkout.types"
import type { ShippingCountry } from "@/shared/constants/countries"

interface CheckoutContainerProps {
	cart: NonNullable<GetCartReturn>
	session: Session | null
	addresses: GetUserAddressesReturn | null
}

type CheckoutStep = "address" | "payment"

/**
 * Conteneur principal du checkout avec flow en 2 étapes
 * Étape 1 : Formulaire d'adresse
 * Étape 2 : Formulaire de paiement Stripe Embedded
 */
export function CheckoutContainer({
	cart,
	session,
	addresses,
}: CheckoutContainerProps) {
	const [step, setStep] = useState<CheckoutStep>("address")
	const [clientSecret, setClientSecret] = useState<string | null>(null)
	const [orderInfo, setOrderInfo] = useState<{
		orderId: string
		orderNumber: string
	} | null>(null)
	const [selectedCountry, setSelectedCountry] = useState<ShippingCountry>("FR")
	const [postalCode, setPostalCode] = useState<string>("")

	const handleAddressValidated = (data: CreateCheckoutSessionResult) => {
		setClientSecret(data.clientSecret)
		setOrderInfo({ orderId: data.orderId, orderNumber: data.orderNumber })
		setStep("payment")
	}

	const handleBackToAddress = () => {
		setStep("address")
		// Note: On ne reset pas clientSecret car la session Stripe reste valide 30min
		// L'utilisateur peut revenir au paiement sans recréer de session
	}

	const steps = [
		{ id: "address", label: "Adresse", icon: MapPin },
		{ id: "payment", label: "Paiement", icon: CreditCard },
	] as const

	const currentStepIndex = step === "address" ? 0 : 1

	return (
		<div className="grid lg:grid-cols-3 gap-8">
			{/* Formulaire - 2/3 de la largeur */}
			<div className="lg:col-span-2 space-y-6">
				{/* Indicateur de progression (Baymard: réduction abandons) */}
				<nav aria-label="Étapes du paiement" className="mb-2">
					<ol className="flex items-center gap-2">
						{steps.map((s, index) => {
							const Icon = s.icon
							const isActive = index === currentStepIndex
							const isCompleted = index < currentStepIndex
							return (
								<li key={s.id} className="flex items-center gap-2">
									<div
										className={cn(
											"flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
											isActive && "bg-primary text-primary-foreground",
											isCompleted && "bg-primary/20 text-primary",
											!isActive && !isCompleted && "bg-muted text-muted-foreground"
										)}
										aria-current={isActive ? "step" : undefined}
									>
										<Icon className="w-4 h-4" aria-hidden="true" />
										<span className="hidden sm:inline">{s.label}</span>
										<span className="sm:hidden">{index + 1}</span>
									</div>
									{index < steps.length - 1 && (
										<div
											className={cn(
												"w-8 h-0.5 rounded-full",
												isCompleted ? "bg-primary" : "bg-muted"
											)}
											aria-hidden="true"
										/>
									)}
								</li>
							)
						})}
					</ol>
					<p className="sr-only">
						Étape {currentStepIndex + 1} sur {steps.length} : {steps[currentStepIndex].label}
					</p>
				</nav>

				{step === "address" && (
					<ErrorBoundary
						errorMessage="Impossible de charger le formulaire d'adresse"
						className="p-8 rounded-lg border bg-muted/50"
					>
						<CheckoutForm
							cart={cart}
							session={session}
							addresses={addresses}
							onSuccess={handleAddressValidated}
							onCountryChange={setSelectedCountry}
							onPostalCodeChange={setPostalCode}
						/>
					</ErrorBoundary>
				)}

				{step === "payment" && clientSecret && (
					<div className="space-y-6">
						{/* Bouton retour */}
						<Button
							variant="ghost"
							size="sm"
							onClick={handleBackToAddress}
							className="text-muted-foreground hover:text-foreground"
						>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Modifier mon adresse
						</Button>

						{/* En-tête paiement */}
						<div className="space-y-2">
							<h2 className="text-xl font-semibold flex items-center gap-2">
								<CreditCard className="w-5 h-5" />
								Paiement sécurisé
							</h2>
							<p className="text-sm text-muted-foreground">
								Finalise ta commande avec Stripe, leader de la sécurité des
								paiements en ligne.
							</p>
						</div>

						{/* Formulaire Stripe Embedded */}
						<div className="rounded-lg border overflow-hidden">
							<EmbeddedCheckoutWrapper clientSecret={clientSecret} />
						</div>

						{/* Message sécurité */}
						<div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
							<Shield className="w-4 h-4 mt-0.5 shrink-0" />
							<p>
								Tes informations de paiement sont protégées par le chiffrement
								SSL. Je n'enregistre jamais tes coordonnées bancaires.
							</p>
						</div>

						{/* Info commande */}
						{orderInfo && (
							<p className="text-xs text-muted-foreground text-center">
								Commande n°{orderInfo.orderNumber}
							</p>
						)}
					</div>
				)}
			</div>

			{/* Récapitulatif - 1/3 de la largeur */}
			<div className="lg:col-span-1">
				<CheckoutSummary cart={cart} selectedCountry={selectedCountry} postalCode={postalCode} />
			</div>
		</div>
	)
}
