import { Skeleton } from "@/shared/components/ui/skeleton";
import { User } from "lucide-react";

export function ProfileInfoCardSkeleton() {
	return (
		<section className="space-y-4">
			<h2 className="flex items-center gap-2 text-base font-semibold">
				<User className="text-muted-foreground size-4" />
				Profil
			</h2>
			<div className="border-border/60 space-y-3 border-t pt-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-48" />
				</div>
				<Skeleton className="h-9 w-full" />
			</div>
		</section>
	);
}
