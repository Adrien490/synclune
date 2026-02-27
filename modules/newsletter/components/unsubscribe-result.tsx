import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { unsubscribeNewsletter } from "@/modules/newsletter/services/unsubscribe-newsletter";

interface UnsubscribeResultProps {
	token?: string;
}

export async function UnsubscribeResult({ token }: UnsubscribeResultProps) {
	if (!token) {
		return (
			<div className="space-y-6 text-center">
				<div className="text-6xl">🔗</div>
				<h2 className="font-display text-foreground text-xl sm:text-2xl">
					Lien de désinscription manquant
				</h2>
				<p className="text-muted-foreground">
					Le lien de désinscription est manquant. Vérifiez l'email que vous avez reçu ou
					contactez-nous.
				</p>
			</div>
		);
	}

	const result = await unsubscribeNewsletter(token);

	return (
		<div className="space-y-6 text-center">
			<div className="text-6xl">{result.success ? "👋" : "😔"}</div>
			<h2 className="font-display text-foreground text-xl sm:text-2xl">
				{result.success ? "Désinscription confirmée" : "Désinscription impossible"}
			</h2>
			{result.success ? (
				<Alert>
					<AlertDescription>{result.message}</AlertDescription>
				</Alert>
			) : (
				<Alert variant="destructive">
					<AlertDescription>{result.message}</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
