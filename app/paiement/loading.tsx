import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";

function InputSkeleton({ labelWidth = "w-28" }: { labelWidth?: string }) {
	return (
		<div className="space-y-2">
			<Skeleton className={`h-4 ${labelWidth}`} />
			<Skeleton className="h-10 w-full rounded-md" />
		</div>
	);
}

function SectionHeading({ width }: { width: string }) {
	return <Skeleton className={`h-6 ${width}`} />;
}

function SummaryItemSkeleton() {
	return (
		<div className="flex gap-3">
			<Skeleton className="size-16 shrink-0 rounded-xl" />
			<div className="min-w-0 flex-1 gap-y-1.5">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-3 w-20" />
				<Skeleton className="h-3 w-16" />
			</div>
			<Skeleton className="h-4 w-14" />
		</div>
	);
}

function SummaryContent() {
	return (
		<>
			{/* Items */}
			<div className="space-y-3">
				<SummaryItemSkeleton />
				<SummaryItemSkeleton />
			</div>

			{/* Modifier link */}
			<div className="text-center">
				<Skeleton className="mx-auto h-4 w-28" />
			</div>

			<Separator />

			{/* Pricing */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-5 w-16" />
				</div>
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-5 w-14" />
				</div>
			</div>

			<Separator />

			{/* Total */}
			<div className="bg-primary/5 -mx-1 space-y-2 rounded-xl p-3">
				<div className="flex items-center justify-between">
					<Skeleton className="h-6 w-12" />
					<Skeleton className="h-7 w-20" />
				</div>
				<div className="flex justify-end">
					<Skeleton className="h-3 w-36" />
				</div>
			</div>

			{/* Trust badges */}
			<div className="border-primary/5 space-y-3 border-t pt-4">
				<div className="flex items-center justify-center gap-2">
					<Skeleton className="h-5 w-8" />
					<Skeleton className="h-5 w-8" />
					<Skeleton className="h-5 w-8" />
				</div>
				<div className="flex items-center justify-center gap-1.5">
					<Skeleton className="size-3.5 rounded-full" />
					<Skeleton className="h-3 w-32" />
				</div>
				<div className="flex items-center justify-center gap-3">
					<Skeleton className="h-3 w-24" />
					<Skeleton className="h-3 w-8" />
				</div>
			</div>
		</>
	);
}

export default function CheckoutLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="L'atelier prépare ton paiement…"
			className="relative min-h-dvh"
			style={{ viewTransitionName: "shop-paiement" }}
		>
			{/* Decorative background */}
			<div
				className="from-primary/5 to-secondary/5 fixed inset-0 -z-10 bg-linear-to-br via-transparent"
				style={{ viewTransitionName: "none" }}
			/>

			{/* `pb-8` et pas `pb-[calc(theme(spacing.8)+env(safe-area-inset-bottom))]` :
			    `theme()` est l'API Tailwind v3, et la safe-area est déjà couverte deux fois
			    (la barre CTA porte `pb-[max(0.75rem,env(safe-area-inset-bottom))]`, et la
			    colonne formulaire réserve `--pay-bar-height`). Aligné sur `page.tsx`. */}
			<section className="py-4 pb-8 sm:py-8 md:py-10 md:pb-10">
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					{/*
					 * Titre rendu sur TOUS les viewports, comme la vraie page.
					 *
					 * Le commentaire « hidden on mobile like the real page » était faux :
					 * `app/paiement/page.tsx` rend son `<h1>Finaliser ma commande</h1>` sans
					 * aucun gate de breakpoint (`max-sm:text-center`). Le squelette le
					 * masquait sous `sm`, donc tout le formulaire remontait d'environ 50 px
					 * au moment du rendu réel.
					 *
					 * Hauteurs alignées sur `text-xl` (28 px de line-height) puis
					 * `sm:text-3xl` (36 px).
					 */}
					<div className="mb-4 sm:mb-6">
						<Skeleton className="h-7 w-56 max-sm:mx-auto sm:h-9 sm:w-72" />
						<div className="mt-2 max-sm:flex max-sm:justify-center">
							<Skeleton className="h-1.5 w-15 rounded-full" />
						</div>
					</div>

					{/*
					 * PARITÉ AVEC LA PAGE RÉELLE — le squelette enveloppait chaque section dans
					 * une carte (`bg-card border-primary/10 rounded-2xl border px-6 py-5`) alors
					 * que `CheckoutSection` rend une `<section>` NUE : l'utilisateur voyait
					 * quatre cartes bordées, puis tout s'aplatissait au rendu réel. Le squelette
					 * suit désormais la réalité (sections nues, colonne en `space-y-8`, strip de
					 * confiance non encadré, réserve `--pay-bar-height`).
					 * Verrouillé par `checkout-loading-parity.regression.test.ts`.
					 * Audit UI/UX paiement 2026-07-26, F4.
					 */}
					<div className="grid gap-6 pb-[calc(var(--pay-bar-height,8rem)+1rem)] lg:grid-cols-[1fr_360px] lg:gap-8 lg:pb-0">
						{/* Left column — Form */}
						<div className="space-y-8" style={{ viewTransitionName: "shop-paiement-form" }}>
							{/* Note « champs obligatoires » — en tête de formulaire, comme la page */}
							<Skeleton className="h-4 w-56" />

							{/* Contact */}
							<section className="space-y-5">
								<SectionHeading width="w-20" />
								<InputSkeleton labelWidth="w-28" />
								<Skeleton className="h-4 w-64" />
							</section>

							{/* Livraison */}
							<section className="space-y-5">
								<SectionHeading width="w-24" />
								<InputSkeleton labelWidth="w-24" />
								<InputSkeleton labelWidth="w-20" />
								<Skeleton className="h-4 w-44" />
								<div className="grid grid-cols-2 gap-3 sm:gap-6">
									<InputSkeleton labelWidth="w-24" />
									<InputSkeleton labelWidth="w-12" />
								</div>
								<InputSkeleton labelWidth="w-12" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full rounded-md" />
									<Skeleton className="h-3 w-52" />
								</div>
							</section>

							{/* Frais et délai de livraison */}
							<section className="space-y-5">
								<SectionHeading width="w-44" />
								<Skeleton className="h-16 w-full rounded-xl" />
							</section>

							{/* Code promo — collapsed link */}
							<div className="-mx-3 flex min-h-11 items-center px-3">
								<Skeleton className="h-4 w-44" />
							</div>

							{/* Paiement */}
							<section className="space-y-5">
								<SectionHeading width="w-24" />
								<Skeleton className="h-4 w-72" />

								{/* Stripe PaymentElement placeholder — min-h identique à
								    `PaymentSectionSkeleton` (CLS) */}
								<div className="min-h-[360px] space-y-4 rounded-xl border p-6 motion-safe:animate-pulse">
									<Skeleton className="h-4 w-40" />
									<Skeleton className="h-11 w-full rounded" />
									<div className="grid grid-cols-2 gap-4">
										<Skeleton className="h-11 rounded" />
										<Skeleton className="h-11 rounded" />
									</div>
									<Skeleton className="h-11 w-full rounded" />
								</div>

								{/* Trust strip — non encadré, comme `checkout-stripe-section` */}
								<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
									<Skeleton className="h-3 w-28" />
									<Skeleton className="hidden h-3 w-px sm:inline" />
									<Skeleton className="h-3 w-24" />
								</div>

								{/* Terms + button */}
								<div className="space-y-3">
									<Skeleton className="mx-auto h-4 w-72" />
									<Skeleton className="h-12 w-full rounded-md" />
								</div>
							</section>
						</div>

						{/* Right column — Summary */}
						<div
							className="order-first lg:order-0"
							style={{ viewTransitionName: "shop-paiement-summary" }}
						>
							{/* Mobile: collapsed card — `lg:` comme `CheckoutSummary` (la grille ne
							    passe à deux colonnes qu'à `lg`) */}
							<Card className="border-primary/10 rounded-2xl shadow-md lg:hidden">
								<CardHeader className="pb-0">
									<div className="flex items-center justify-between">
										<Skeleton className="h-5 w-24" />
										<div className="flex items-center gap-2">
											<Skeleton className="h-6 w-16" />
											<Skeleton className="size-4" />
										</div>
									</div>
								</CardHeader>
							</Card>

							{/* Desktop: sticky sidebar */}
							<Card className="border-primary/10 hidden rounded-2xl shadow-md lg:sticky lg:top-8 lg:block">
								<CardHeader className="pb-4">
									<Skeleton className="h-6 w-40" />
								</CardHeader>
								<CardContent className="space-y-4 pb-6">
									<SummaryContent />
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</section>

			{/* Sticky PayButton placeholder (CLS-safe: matches the real fixed-bottom bar,
			    which stays `fixed` until `lg:`) */}
			<div
				aria-hidden="true"
				data-hide-on-keyboard=""
				className="border-primary/10 bg-background/95 fixed inset-x-0 bottom-0 z-30 space-y-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-8px_rgb(0_0_0_/_0.08)] backdrop-blur-md lg:hidden"
			>
				<Skeleton className="h-12 w-full rounded-md" />
			</div>
		</div>
	);
}
