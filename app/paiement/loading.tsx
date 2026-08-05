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

/**
 * Reproduit la géométrie de `CheckoutSection` : surface, filet d'accent de 3px,
 * rayon `lg`, padding `p-5 sm:p-6`. Le squelette suit la page — c'est la
 * décision assumée de `checkout-loading-parity.regression.test.ts`.
 */
function SectionSkeleton({
	accent,
	children,
}: {
	accent: "rose" | "lavender" | "mint" | "sun";
	children: React.ReactNode;
}) {
	return (
		<section
			data-accent={accent}
			className="border-border bg-card flex rounded-lg border shadow-sm"
		>
			<span aria-hidden="true" className="w-[3px] shrink-0 rounded-l-lg bg-(--section-accent)" />
			<div className="min-w-0 flex-1 space-y-5 p-5 sm:p-6">{children}</div>
		</section>
	);
}

function SummaryItemSkeleton() {
	return (
		<div className="flex gap-3">
			<Skeleton className="size-16 shrink-0 rounded-sm" />
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

			<Separator className="border-border border-t border-dashed bg-transparent" />

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

			<Separator className="border-border border-t border-dashed bg-transparent" />

			{/* Total */}
			<div className="bg-primary/5 -mx-1 space-y-2 rounded-md p-3">
				<div className="flex items-center justify-between">
					<Skeleton className="h-6 w-12" />
					<Skeleton className="h-7 w-20" />
				</div>
				<div className="flex justify-end">
					<Skeleton className="h-3 w-36" />
				</div>
			</div>

			{/* Trust badges — DEUX rangées, comme `CheckoutSummary` : les logos de
			    cartes puis les liens de confiance. Une troisième rangée (pastille +
			    libellé) y survivait au retrait de « Paiement 100% sécurisé », l'une des
			    quatre mentions de sécurité ramenées à deux : le squelette réservait donc
			    une ligne qui ne se peignait jamais. Filet tireté comme la fiche. */}
			<div className="border-border space-y-3 border-t border-dashed pt-4">
				<div className="flex items-center justify-center gap-2">
					<Skeleton className="h-5 w-8" />
					<Skeleton className="h-5 w-8" />
					<Skeleton className="h-5 w-8" />
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
							<SectionSkeleton accent="rose">
								<SectionHeading width="w-20" />
								<InputSkeleton labelWidth="w-28" />
							</SectionSkeleton>

							{/* Livraison */}
							<SectionSkeleton accent="lavender">
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
							</SectionSkeleton>

							{/* Frais et délai de livraison */}
							<SectionSkeleton accent="mint">
								<SectionHeading width="w-44" />
								<Skeleton className="h-16 w-full rounded-lg" />
							</SectionSkeleton>

							{/* Paiement */}
							<SectionSkeleton accent="sun">
								<SectionHeading width="w-24" />
								<Skeleton className="h-4 w-72" />

								{/* Stripe PaymentElement placeholder — min-h identique à
								    `PaymentSectionSkeleton` (CLS) */}
								<div className="min-h-[360px] space-y-4 rounded-lg border p-6 motion-safe:animate-pulse">
									<Skeleton className="h-4 w-40" />
									<Skeleton className="h-11 w-full rounded" />
									<div className="grid grid-cols-2 gap-4">
										<Skeleton className="h-11 rounded" />
										<Skeleton className="h-11 rounded" />
									</div>
									<Skeleton className="h-11 w-full rounded" />
								</div>

								{/* Terms + button */}
								<div className="space-y-3">
									<Skeleton className="mx-auto h-4 w-72" />
									<Skeleton className="h-12 w-full rounded-md" />
								</div>
							</SectionSkeleton>
						</div>

						{/* Right column — Summary */}
						<div
							className="order-first lg:order-0"
							style={{ viewTransitionName: "shop-paiement-summary" }}
						>
							{/* Le résumé n'est plus une `Card` mais une fiche scotchée
							    (cf. `CheckoutSummary`) : papier, rayon `sm`, filet plein,
							    scotch au-dessus. Le squelette suit la page.
							    Le seuil reste `lg:` — la grille ne passe à deux colonnes
							    qu'à `lg`, jamais à `md` (iPad portrait). */}
							<div className="relative pt-3 lg:hidden">
								<Skeleton className="absolute top-0 left-1/2 h-5 w-20 -translate-x-1/2 -rotate-2 rounded-[2px]" />
								<div className="border-border bg-card flex items-center justify-between rounded-sm border p-4 shadow-sm">
									<Skeleton className="h-5 w-24" />
									<div className="flex items-center gap-2">
										<Skeleton className="h-6 w-16" />
										<Skeleton className="size-4" />
									</div>
								</div>
							</div>

							<div className="relative hidden pt-3 lg:sticky lg:top-8 lg:block">
								<Skeleton className="absolute top-0 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-2 rounded-[2px]" />
								<div className="border-border bg-card relative space-y-4 rounded-sm border p-5 shadow-sm">
									<Skeleton className="h-6 w-40" />
									<SummaryContent />
								</div>
							</div>
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
