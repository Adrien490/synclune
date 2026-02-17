import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { unsubscribeNewsletter } from "@/modules/newsletter/services/unsubscribe-newsletter";
import Link from "next/link";

interface UnsubscribeResultProps {
	token?: string;
}

export async function UnsubscribeResult({ token }: UnsubscribeResultProps) {
	if (!token) {
		return (
			<div className="text-center space-y-6">
				<div className="text-6xl">🔗</div>
				<h2 className="text-xl sm:text-2xl font-display text-foreground">
					Lien de désinscription manquant
				</h2>
				<p className="text-muted-foreground">
					Le lien de désinscription est manquant. Vérifiez l'email que
					vous avez reçu ou contactez-nous.
				</p>
			</div>
		);
	}

	const result = await unsubscribeNewsletter(token);

	return (
		<div className="text-center space-y-6">
			<div className="text-6xl">{result.success ? "👋" : "😔"}</div>
			<h2 className="text-xl sm:text-2xl font-display text-foreground">
				{result.success
					? "Désinscription confirmée"
					: "Désinscription impossible"}
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
