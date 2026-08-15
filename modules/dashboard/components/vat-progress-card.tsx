import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { formatEuro } from "@/shared/utils/format-euro";

interface VatProgressCardProps {
	yearRevenueCents: number;
	franchiseThresholdCents: number;
	majoredThresholdCents: number;
}

/**
 * Progression du CA annuel vers le seuil de franchise TVA (art. 293 B CGI).
 *
 * ⚠️ Les deux seuils n'ont PAS la même conséquence, et il ne faut pas
 * annoncer la seconde dès le premier (règle historique du dépôt) :
 * - seuil de BASE dépassé → la franchise reste acquise jusqu'au 31 décembre,
 *   la TVA est due au 1ᵉʳ janvier suivant ;
 * - seuil MAJORÉ dépassé → la TVA est due dès le 1ᵉʳ jour du mois de
 *   dépassement.
 */
export function VatProgressCard({
	yearRevenueCents,
	franchiseThresholdCents,
	majoredThresholdCents,
}: VatProgressCardProps) {
	const ratio = franchiseThresholdCents > 0 ? yearRevenueCents / franchiseThresholdCents : 0;
	const percent = Math.min(100, Math.round(ratio * 100));
	const isOverBase = yearRevenueCents >= franchiseThresholdCents;
	const isOverMajored = yearRevenueCents >= majoredThresholdCents;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Franchise de TVA (art. 293 B CGI)</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex items-baseline justify-between gap-4 text-sm">
					<span className="text-muted-foreground">CA encaissé cette année</span>
					<span className="font-medium">
						{formatEuro(yearRevenueCents)} / {formatEuro(franchiseThresholdCents)}
					</span>
				</div>
				<Progress value={percent} aria-label={`${percent} % du seuil de franchise de TVA`} />
				{isOverMajored ? (
					<p className="text-destructive text-sm font-medium">
						Seuil majoré dépassé : la TVA est due depuis le 1ᵉʳ jour du mois de dépassement.
						Contacte ton comptable sans attendre.
					</p>
				) : isOverBase ? (
					<p className="text-destructive text-sm">
						Seuil de base dépassé : la franchise reste acquise jusqu&apos;au 31 décembre, la TVA
						sera due au 1ᵉʳ janvier. En dessous de {formatEuro(majoredThresholdCents)} (seuil
						majoré), rien ne change avant.
					</p>
				) : (
					<p className="text-muted-foreground text-sm">
						{percent} % du seuil — en dessous, aucune TVA à facturer ni à déclarer.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
