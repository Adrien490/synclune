import { Skeleton } from "@/shared/components/ui/skeleton";
import { User } from "lucide-react";

export function ProfileInfoCardSkeleton() {
	return (
		<section className="space-y-4">
			<h2 className="text-base font-semibold flex items-center gap-2">
				<User className="size-4 text-muted-foreground" />
				Profil
			</h2>
			<div className="border-t border-border/60 pt-4 space-y-3">
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-48" />
				</div>
				<Skeleton className="h-9 w-full" />
			</div>
		</section>
	);
}
