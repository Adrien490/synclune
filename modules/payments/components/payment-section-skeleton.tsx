/**
 * Skeleton placeholder for the Stripe payment section.
 *
 * Rendered while the Payment Intent is loading (`usePaymentIntent.isLoading`)
 * or as the `next/dynamic` fallback for the lazy-loaded Stripe bundle.
 * Fixed min-height prevents layout shift during hydration.
 */
export function PaymentSectionSkeleton() {
	return (
		<div
			className="min-h-[360px] animate-pulse space-y-4 rounded-xl border p-6"
			aria-busy="true"
			role="status"
		>
			<span className="sr-only">Chargement du formulaire de paiement…</span>
			<div className="bg-muted h-4 w-40 rounded" />
			<div className="bg-muted h-11 w-full rounded" />
			<div className="grid grid-cols-2 gap-4">
				<div className="bg-muted h-11 rounded" />
				<div className="bg-muted h-11 rounded" />
			</div>
			<div className="bg-muted h-11 w-full rounded" />
		</div>
	);
}
