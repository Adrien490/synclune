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

			<section className="py-4 pb-[calc(theme(spacing.32)+env(safe-area-inset-bottom))] sm:py-8 md:py-10 md:pb-10">
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					{/* Title — hidden on mobile like the real page */}
					<div className="mb-6 hidden sm:mb-8 sm:block">
						<Skeleton className="h-8 w-56 sm:h-9 sm:w-72" />
						<Skeleton className="mt-2 h-1.5 w-20 rounded-full" />
					</div>

					<div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
						{/* Left column — Form */}
						<div className="space-y-6" style={{ viewTransitionName: "shop-paiement-form" }}>
							{/* Contact */}
							<div className="bg-card border-primary/10 rounded-2xl border px-6 py-5">
								<section className="space-y-5">
									<SectionHeading width="w-20" />
									<InputSkeleton labelWidth="w-28" />
									<Skeleton className="h-4 w-64" />
								</section>
							</div>

							{/* Livraison */}
							<div className="bg-card border-primary/10 rounded-2xl border px-6 py-5">
								<section className="space-y-5">
									<SectionHeading width="w-24" />
									<Skeleton className="h-4 w-56" />
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
							</div>

							{/* Mode d'expedition */}
							<div className="bg-card border-primary/10 rounded-2xl border px-6 py-5">
								<section className="space-y-5">
									<SectionHeading width="w-44" />
									<Skeleton className="h-16 w-full rounded-xl" />
								</section>
							</div>

							{/* Code promo — collapsed link */}
							<div className="-mx-3 flex min-h-11 items-center px-3">
								<Skeleton className="h-4 w-44" />
							</div>

							{/* Paiement */}
							<div className="bg-card border-primary/10 rounded-2xl border px-6 py-5">
								<section className="space-y-5">
									<SectionHeading width="w-24" />

									{/* Stripe PaymentElement placeholder (CLS-safe: min-h reserves vertical space for real element) */}
									<div className="min-h-[360px] animate-pulse space-y-4 rounded-xl border p-6">
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

									{/* Trust badges */}
									<div className="border-primary/5 bg-primary/5 rounded-xl border p-4">
										<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
											<Skeleton className="h-3 w-28" />
											<Skeleton className="hidden h-3 w-px sm:inline" />
											<Skeleton className="h-3 w-24" />
										</div>
									</div>
								</section>
							</div>
						</div>

						{/* Right column — Summary */}
						<div
							className="order-first lg:order-0"
							style={{ viewTransitionName: "shop-paiement-summary" }}
						>
							{/* Mobile: collapsed card */}
							<Card className="border-primary/10 rounded-2xl shadow-md md:hidden">
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
							<Card className="border-primary/10 hidden rounded-2xl shadow-md md:sticky md:top-24 md:block">
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

			{/* Sticky PayButton placeholder (CLS-safe: matches the real fixed-bottom button on mobile) */}
			<div
				aria-hidden="true"
				data-hide-on-keyboard=""
				className="border-primary/10 bg-background/95 fixed inset-x-0 bottom-0 z-30 space-y-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-8px_rgb(0_0_0_/_0.08)] backdrop-blur-md md:hidden"
			>
				<Skeleton className="h-12 w-full rounded-md" />
			</div>
		</div>
	);
}
