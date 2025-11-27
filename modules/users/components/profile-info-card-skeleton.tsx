import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { User } from "lucide-react";

export function ProfileInfoCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg font-semibold flex items-center gap-2">
					<User className="h-4 w-4" />
					Profil
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-48" />
				</div>
				<Skeleton className="h-9 w-full" />
			</CardContent>
		</Card>
	);
}
