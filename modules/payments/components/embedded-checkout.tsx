"use client"

import { Component, type ReactNode } from "react"
import {
	EmbeddedCheckout,
	EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { getStripe } from "@/shared/lib/stripe-client"
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface EmbeddedCheckoutWrapperProps {
	clientSecret: string
}

interface ErrorBoundaryState {
	hasError: boolean
}

/**
 * Error boundary pour capturer les erreurs de chargement Stripe
 * (bloqueurs de pub, erreurs reseau, etc.)
 */
class EmbeddedCheckoutErrorBoundary extends Component<
	{ children: ReactNode },
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = { hasError: false }

	static getDerivedStateFromError(): ErrorBoundaryState {
		return { hasError: true }
	}

	render() {
		if (this.state.hasError) {
			return (
				<Alert variant="destructive">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Erreur de chargement</AlertTitle>
					<AlertDescription className="space-y-3">
						<p>
							Le formulaire de paiement n'a pas pu se charger. Cela peut etre du
							a un bloqueur de publicites ou a un probleme de connexion.
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => window.location.reload()}
						>
							Recharger la page
						</Button>
					</AlertDescription>
				</Alert>
			)
		}
		return this.props.children
	}
}

/**
 * Composant wrapper pour Stripe Embedded Checkout
 * Affiche le formulaire de paiement Stripe integre directement sur le site
 */
export function EmbeddedCheckoutWrapper({
	clientSecret,
}: EmbeddedCheckoutWrapperProps) {
	return (
		<EmbeddedCheckoutErrorBoundary>
			<div role="region" aria-label="Formulaire de paiement securise">
				<EmbeddedCheckoutProvider
					stripe={getStripe()}
					options={{ clientSecret }}
				>
					<EmbeddedCheckout />
				</EmbeddedCheckoutProvider>
			</div>
		</EmbeddedCheckoutErrorBoundary>
	)
}
