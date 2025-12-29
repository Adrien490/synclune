import { Card, CardContent } from "@/shared/components/ui/card";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { fetchAccountStats } from "@/modules/users/data/get-account-stats";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { use } from "react";

interface AccountStatsCardsProps {
	userPromise: ReturnType<typeof getCurrentUser>;
}

export function AccountStatsCards({ userPromise }: AccountStatsCardsProps) {
	const user = use(userPromise);

	if (!user) return null;

	const statsPromise = fetchAccountStats(user.id);
	const { totalOrders } = use(statsPromise);

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
						{totalOrders} commande{totalOrders !== 1 ? "s" : ""}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

