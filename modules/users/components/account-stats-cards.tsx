import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { prisma } from "@/shared/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { use } from "react";

async function getAccountStats(userId: string) {
	const orderCount = await prisma.order.count({
		where: { userId },
	});

	return { orderCount };
}

interface AccountStatsCardsProps {
	userPromise: ReturnType<typeof getCurrentUser>;
}

export function AccountStatsCards({ userPromise }: AccountStatsCardsProps) {
	const user = use(userPromise);

	if (!user) return null;

	const statsPromise = getAccountStats(user.id);
	const { orderCount } = use(statsPromise);

	const memberSince = format(user.createdAt, "MMMM yyyy", { locale: fr });

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<Card>
				<CardContent className="pt-6">
					<p className="text-sm text-muted-foreground">Membre depuis</p>
					<p className="text-lg font-semibold capitalize">{memberSince}</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-6">
					<p className="text-sm text-muted-foreground">Commandes passées</p>
					<p className="text-lg font-semibold">
						{orderCount} commande{orderCount !== 1 ? "s" : ""}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

export function AccountStatsCardsSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<Card>
				<CardContent className="pt-6">
					<Skeleton className="h-4 w-24 mb-2" />
					<Skeleton className="h-6 w-32" />
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-6">
					<Skeleton className="h-4 w-32 mb-2" />
					<Skeleton className="h-6 w-24" />
				</CardContent>
			</Card>
		</div>
	);
}
