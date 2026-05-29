import Link from "next/link";
import { Heart, MapPin, Package } from "lucide-react";

import { ROUTES } from "@/shared/constants/urls";
import { formatDateLong } from "@/shared/utils/dates";

interface AccountSummaryCardProps {
	name: string | null;
	email: string;
	createdAt: Date | null;
}

const quickLinks = [
	{ href: ROUTES.ACCOUNT.ORDERS, label: "Mes commandes", icon: Package },
	{ href: ROUTES.ACCOUNT.ADDRESSES, label: "Mes adresses", icon: MapPin },
	{ href: ROUTES.ACCOUNT.FAVORITES, label: "Mes favoris", icon: Heart },
] as const;

/**
 * Carte récapitulative affichée dans la colonne latérale de la page Paramètres.
 * Utilise uniquement les données déjà chargées (getCurrentUser) — aucune requête
 * supplémentaire — pour équilibrer la mise en page desktop et offrir des accès rapides.
 */
export function AccountSummaryCard({ name, email, createdAt }: AccountSummaryCardProps) {
	return (
		<section className="space-y-4" aria-labelledby="account-summary-heading">
			<h2 id="account-summary-heading" className="text-base font-semibold">
				Mon compte
			</h2>
			<div className="border-border/60 space-y-4 border-t pt-4">
				<div className="space-y-0.5">
					{name && <p className="text-sm font-medium">{name}</p>}
					<p className="text-muted-foreground text-sm break-words">{email}</p>
					{createdAt && (
						<p className="text-muted-foreground text-xs">
							Membre depuis {formatDateLong(createdAt)}
						</p>
					)}
				</div>

				<nav aria-label="Accès rapides" className="flex flex-col gap-1">
					{quickLinks.map((link) => {
						const Icon = link.icon;
						return (
							<Link
								key={link.href}
								href={link.href}
								className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-primary -mx-2 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
							>
								<Icon className="size-4 shrink-0" aria-hidden="true" />
								{link.label}
							</Link>
						);
					})}
				</nav>
			</div>
		</section>
	);
}
