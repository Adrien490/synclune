import { Skeleton } from "@/shared/components/ui/skeleton";

export default function OrderNotesLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement des notes"
			className="flex h-full min-h-0 flex-col gap-4"
		>
			<span className="sr-only">Chargement des notes…</span>
			<div className="hidden md:block">
				<Skeleton className="h-7 w-44" />
				<Skeleton className="mt-2 h-4 w-56" />
			</div>
			<div className="max-w-2xl space-y-3">
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-10 w-32" />
			</div>
		</div>
	);
}
