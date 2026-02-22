import type { GetAccountStatsReturn } from "@/modules/users/data/get-account-stats";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { use } from "react";

interface AccountStatsCardsProps {
	statsPromise: Promise<GetAccountStatsReturn>;
	memberSince: Date;
}

export function AccountStatsCards({
	statsPromise,
	memberSince,
}: AccountStatsCardsProps) {
	const stats = use(statsPromise);
	const totalOrders = stats?.totalOrders ?? 0;

	const memberSinceLabel = format(memberSince, "MMMM yyyy", { locale: fr });

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="rounded-xl border border-border/60 p-4">
				<p className="text-sm text-muted-foreground">Membre depuis</p>
				<p className="text-lg font-semibold capitalize">
					{memberSinceLabel}
				</p>
			</div>

			<div className="rounded-xl border border-border/60 p-4">
				<p className="text-sm text-muted-foreground">Commandes passées</p>
				<p className="text-lg font-semibold">
					{totalOrders} commande{totalOrders !== 1 ? "s" : ""}
				</p>
			</div>
		</div>
	);
}
