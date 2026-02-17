import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { confirmNewsletterSubscription } from "@/modules/newsletter/services/confirm-newsletter-subscription";
import Link from "next/link";

interface ConfirmationResultProps {
	token?: string;
}

export async function ConfirmationResult({ token }: ConfirmationResultProps) {
	if (!token) {
		return (
			<div className="text-center space-y-6">
				<div className="text-6xl">🔗</div>
				<h2 className="text-xl sm:text-2xl font-display text-foreground">
					Lien de confirmation manquant
				</h2>
				<p className="text-muted-foreground">
					Le lien de confirmation est manquant. Vérifiez l'email que vous
					avez reçu ou réinscrivez-vous.
				</p>
				<Button asChild variant="outline">
					<Link href="/#newsletter">Me réinscrire</Link>
				</Button>
			</div>
		);
	}

	const result = await confirmNewsletterSubscription(token);

	return (
		<div className="text-center space-y-6">
			<div className="text-6xl">{result.success ? "🎉" : "😔"}</div>
			<h2 className="text-xl sm:text-2xl font-display text-foreground">
				{result.success
					? "Inscription confirmée !"
					: "Confirmation impossible"}
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
			{!result.success && (
				<Button asChild variant="outline">
					<Link href="/#newsletter">Me réinscrire</Link>
				</Button>
			)}
		</div>
	);
}
