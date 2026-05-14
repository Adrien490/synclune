import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function DiscountEditPageSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du code promo"
			className="mx-auto flex w-full max-w-3xl flex-col gap-6"
		>
			<span className="sr-only">Chargement du code promo…</span>

			<header className="hidden space-y-2 md:block">
				<div className="space-y-1">
					<Skeleton className="h-8 w-72" />
					<Skeleton className="h-4 w-96 max-w-full" />
				</div>
			</header>

			<Separator className="hidden md:block" />

			<div className="flex flex-col gap-6">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
					</div>
				))}

				{/* Sticky footer — mirror AdminFormFooter */}
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:bg-transparent md:p-0 md:pb-0 md:backdrop-blur-none">
					<div className="flex justify-end">
						<Skeleton className="h-11 w-full sm:w-auto sm:min-w-56" />
					</div>
				</div>
			</div>
		</div>
	);
}
