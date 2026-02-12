"use client"

import { Component, type ReactNode, useState, useRef, useEffect } from "react"
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
import {
	Skeleton,
	SkeletonGroup,
} from "@/shared/components/ui/skeleton"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

interface EmbeddedCheckoutWrapperProps {
	clientSecret: string
}

interface ErrorBoundaryProps {
	children: ReactNode
	onRetry: () => void
}

interface ErrorBoundaryState {
	hasError: boolean
}

/**
 * Error boundary to catch Stripe loading errors
 * (ad blockers, network errors, etc.)
 */
class EmbeddedCheckoutErrorBoundary extends Component<
	ErrorBoundaryProps,
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
							Le formulaire de paiement n'a pas pu se charger.
						</p>
						<ul className="text-sm space-y-1 list-disc pl-4">
							<li>Désactive ton bloqueur de publicités sur cette page</li>
							<li>Vérifie ta connexion internet</li>
							<li>Essaie avec un autre navigateur</li>
						</ul>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={this.props.onRetry}>
								Réessayer
							</Button>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/personnalisation">M'écrire</Link>
							</Button>
						</div>
					</AlertDescription>
				</Alert>
			)
		}
		return this.props.children
	}
}

/**
 * Skeleton displayed while Stripe Embedded Checkout is loading
 */
function EmbeddedCheckoutSkeleton() {
	return (
		<SkeletonGroup label="Chargement du formulaire de paiement" className="p-6 space-y-6">
			{/* Email field */}
			<div className="space-y-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-10 w-full" shape="rounded" />
			</div>

			{/* Card details */}
			<div className="space-y-2">
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-10 w-full" shape="rounded" />
			</div>

			{/* Expiry + CVC row */}
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-10 w-full" shape="rounded" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-10 w-full" shape="rounded" />
				</div>
			</div>

			{/* Pay button */}
			<Skeleton className="h-12 w-full" shape="rounded" />
		</SkeletonGroup>
	)
}

/**
 * Wrapper for Stripe Embedded Checkout
 * Displays the Stripe payment form embedded directly on the site
 * with skeleton loading, timeout detection, and error recovery without page reload
 */
export function EmbeddedCheckoutWrapper({
	clientSecret,
}: EmbeddedCheckoutWrapperProps) {
	const [stripeKey, setStripeKey] = useState(0)
	const [isReady, setIsReady] = useState(false)
	const [loadTimedOut, setLoadTimedOut] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	// Observe the container for Stripe iframe injection to detect readiness
	useEffect(() => {
		setIsReady(false)
		setLoadTimedOut(false)
		const container = containerRef.current
		if (!container) return

		let timedOut = false
		const timeoutId = setTimeout(() => {
			timedOut = true
			setLoadTimedOut(true)
		}, 15_000)

		const observer = new MutationObserver(() => {
			const iframe = container.querySelector("iframe")
			if (iframe) {
				clearTimeout(timeoutId)
				setIsReady(true)
				observer.disconnect()
			}
		})

		observer.observe(container, { childList: true, subtree: true })

		// Check if iframe already exists
		if (container.querySelector("iframe")) {
			clearTimeout(timeoutId)
			setIsReady(true)
			observer.disconnect()
		}

		return () => {
			clearTimeout(timeoutId)
			observer.disconnect()
		}
	}, [stripeKey])

	const handleRetry = () => {
		setStripeKey((k) => k + 1)
	}

	return (
		<EmbeddedCheckoutErrorBoundary key={stripeKey} onRetry={handleRetry}>
			<div role="region" aria-label="Formulaire de paiement securise">
				{!isReady && <EmbeddedCheckoutSkeleton />}
				{loadTimedOut && !isReady && (
					<div className="text-center space-y-3 p-4">
						<p className="text-sm text-muted-foreground">
							Le formulaire de paiement prend plus de temps que prévu.
							Si tu utilises un bloqueur de publicités, essaie de le désactiver.
						</p>
						<Button variant="outline" size="sm" onClick={handleRetry}>
							Réessayer
						</Button>
					</div>
				)}
				<div ref={containerRef} className={isReady ? "" : "hidden"}>
					<EmbeddedCheckoutProvider
						stripe={getStripe()}
						options={{ clientSecret }}
					>
						<EmbeddedCheckout />
					</EmbeddedCheckoutProvider>
				</div>
			</div>
		</EmbeddedCheckoutErrorBoundary>
	)
}
