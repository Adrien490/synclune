import { HandDrawnUnderline } from "@/shared/components/animations/hand-drawn-accent";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton aligné avec la page réelle (Stripe Embedded Checkout, ui_mode: embedded_page).
 * Le iframe Stripe avec email + adresse + téléphone + carte fait ~860px sur mobile
 * (champs empilés) et ~760px sur desktop (firstName/lastName sur la même ligne).
 * On réserve ces hauteurs pour éviter le CLS au mount.
 */
export default function CheckoutLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="L'atelier prépare ton paiement…"
			className="relative min-h-dvh min-h-screen"
			style={{ viewTransitionName: "shop-paiement" }}
		>
			<div
				className="from-primary/5 to-secondary/8 fixed inset-0 -z-10 bg-linear-to-br via-transparent"
				style={{ viewTransitionName: "none" }}
			/>

			<section className="py-4 pb-8 sm:py-8 md:py-10 md:pb-10">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					{/* Title — hidden on mobile like the real page */}
					<div className="max-sm:sr-only sm:mb-6">
						<Skeleton className="h-8 w-56 sm:h-9 sm:w-72" />
						<div className="mt-2 hidden sm:block">
							<HandDrawnUnderline
								color="var(--primary)"
								width={80}
								strokeWidth={1.5}
								inView={false}
							/>
						</div>
						<Skeleton className="mt-3 hidden h-5 w-80 sm:block" />
					</div>

					{/* Mobile accroche skeleton */}
					<Skeleton className="mx-auto mb-4 h-5 w-52 sm:hidden" />

					{/* Mobile trust hint skeleton */}
					<div className="mb-3 flex items-center justify-center gap-2 sm:hidden">
						<Skeleton className="size-3 rounded-full" />
						<Skeleton className="h-3 w-32" />
					</div>

					{/* Stripe Embedded Checkout iframe placeholder (CLS-safe) */}
					<Skeleton className="bg-card min-h-[860px] w-full rounded-xl border sm:min-h-[760px]" />
				</div>
			</section>
		</div>
	);
}
