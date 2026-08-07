import { CONSUMER_MEDIATOR } from "@/shared/constants/consumer-law";

/**
 * Coordonnées du médiateur de la consommation — rendu partagé des trois pages
 * qui doivent les porter (`/cgv`, `/mentions-legales`, `/informations-legales`).
 *
 * Le composant existe pour la même raison que la SSOT qu'il consomme : les trois
 * pages affichaient trois graphies différentes du même organisme, et
 * `/mentions-legales` n'affichait rien du tout. Un organisme de médiation change ;
 * trois blocs recopiés à la main divergent au premier changement.
 *
 * `variant="compact"` est le format du hub `/informations-legales`, où le bloc est
 * une entrée parmi quatre dans une grille de contacts. Il omet l'adresse postale —
 * c'est un raccourci de navigation, pas la mention opposable, et les deux pages qui
 * la portent utilisent `full`.
 */
export function MediatorDetails({ variant = "full" }: { variant?: "full" | "compact" }) {
	const { name, fullName, address, website, websiteUrl, email } = CONSUMER_MEDIATOR;

	if (variant === "compact") {
		return (
			<p className="text-muted-foreground text-sm">
				<strong>{name}</strong>
				<br />
				{fullName}
				<br />
				<a
					href={websiteUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="underline hover:opacity-80"
				>
					{website}
				</a>
			</p>
		);
	}

	return (
		<div className="border-info/30 bg-info/10 rounded-lg border p-6">
			<p className="mb-3 font-medium">Coordonnées de notre médiateur :</p>
			<div className="space-y-1 text-sm">
				<p>
					<strong>{name}</strong>
				</p>
				<p>{fullName}</p>
				<p>{address.street}</p>
				<p>
					{address.postalCode} {address.city}
				</p>
				<p>{address.country}</p>
				<p className="mt-2">
					<strong>Site internet :</strong>{" "}
					<a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="underline">
						{website}
					</a>
				</p>
				<p>
					<strong>Email :</strong>{" "}
					<a href={`mailto:${email}`} className="underline">
						{email}
					</a>
				</p>
			</div>
		</div>
	);
}
