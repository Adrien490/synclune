import { Logo } from "@/shared/components/logo";
import { Button } from "@/shared/components/ui/button";
import { ResendVerificationEmailForm } from "@/modules/auth/components/resend-verification-email-form";
import { auth } from "@/modules/auth/lib/auth";
import { ajAuth } from "@/shared/lib/arcjet";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Vérification de l'email | Synclune",
	description:
		"Vérifiez votre adresse email pour activer votre compte Synclune.",
	robots: "noindex, nofollow",
	openGraph: {
		title: "Vérification de l'email | Synclune",
		description: "Vérifiez votre adresse email",
		type: "website",
	},
};

interface VerifyEmailPageProps {
	searchParams: Promise<{
		token?: string;
		error?: string;
	}>;
}

async function verifyEmailToken(token: string) {
	try {
		// Protection Arcjet contre le brute-force de tokens
		const headersList = await headers();
		const request = new Request("https://synclune.fr/verifier-email", {
			method: "GET",
			headers: headersList,
		});

		const decision = await ajAuth.protect(request, { requested: 1 });

		// Bloquer si rate limit atteint ou bot détecté
		if (decision.isDenied()) {
			return { success: false, rateLimited: true };
		}

		await auth.api.verifyEmail({
			query: {
				token,
			},
			headers: headersList,
		});
		return { success: true };
	} catch {
		return { success: false };
	}
}

export default async function VerifyEmailPage({
	searchParams,
}: VerifyEmailPageProps) {
	const params = await searchParams;
	const token = params.token;
	const error = params.error;

	let errorMessage = "";
	let isSuccess = false;

	// Vérifier si l'utilisateur est connecté
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const isConnected = !!session?.user;

	// Si l'utilisateur est connecté et n'a pas de token/error, c'est qu'il vient d'être vérifié
	if (isConnected && !token && !error) {
		isSuccess = true;
	}
	// Si on a déjà une erreur dans l'URL
	else if (error === "INVALID_TOKEN") {
		errorMessage = "Le lien de vérification est invalide ou a expiré.";
	}
	// Si on a un token, on tente la vérification
	else if (token) {
		const result = await verifyEmailToken(token);
		if (result.success) {
			// Marquer comme succès pour afficher le message
			isSuccess = true;
		} else if ("rateLimited" in result && result.rateLimited) {
			errorMessage = "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
		} else {
			errorMessage = "Le lien de vérification est invalide ou a expiré.";
		}
	}
	// Si on n'a pas de token
	else {
		errorMessage = "Token de vérification manquant.";
	}

	return (
		<div className="relative">
			{/* Lien retour */}
			<div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
				>
					<ArrowLeft
						size={16}
						className="transition-transform duration-200 group-hover:-translate-x-1"
					/>
					<span className="font-medium">Retour au site</span>
				</Link>
			</div>

			{/* Logo en haut à droite */}
			<div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
				<Logo size={40} priority href="/" />
			</div>

			{/* Contenu principal */}
			<div className="relative z-10 min-h-screen flex items-center justify-center p-4">
				<div className="w-full max-w-md space-y-8">
					{/* Header */}
					<div className="text-center space-y-7">
						<div className="space-y-3">
							<h1 className="text-2xl font-semibold text-foreground">
								Vérification d'email
							</h1>
						</div>
					</div>

					{/* État de la vérification */}
					<div className="space-y-6">
						{isSuccess ? (
							/* Message de succès */
							<div className="space-y-4">
								<div className="rounded-md bg-green-500/15 border border-green-500/30 p-6 flex flex-col items-center gap-4">
									<CheckCircle2 className="h-12 w-12 text-green-500" />
									<div className="text-center space-y-2">
										<p className="text-lg font-medium text-green-700 dark:text-green-400">
											Email vérifié avec succès !
										</p>
										<p className="text-sm text-green-600/90 dark:text-green-400/90">
											{isConnected
												? "Ton compte a été activé et tu es connecté."
												: "Ton compte a été activé. Tu peux maintenant te connecter."}
										</p>
									</div>
								</div>

								<div className="text-center space-y-2">
									<Button asChild className="w-full">
										<Link href={isConnected ? "/" : "/connexion"}>
											{isConnected ? "Retour au site" : "Se connecter"}
										</Link>
									</Button>
									<p className="text-xs text-muted-foreground">
										{isConnected
											? "Clique sur le bouton ci-dessus pour accéder à ton compte."
											: "Clique sur le bouton ci-dessus pour te connecter."}
									</p>
								</div>
							</div>
						) : (
							/* Message d'erreur */
							<div className="space-y-4">
								<div className="rounded-md bg-destructive/15 border border-destructive/30 p-6 flex flex-col items-center gap-4">
									<AlertCircle className="h-12 w-12 text-destructive" />
									<div className="text-center space-y-2">
										<p className="text-lg font-medium text-destructive">
											{!token && !error
												? "Lien incomplet"
												: "Erreur de vérification"}
										</p>
										<p className="text-sm text-destructive/90">
											{errorMessage}
										</p>
									</div>
								</div>

								{/* Formulaire de renvoi d'email */}
								<div className="space-y-3">
									<div className="text-center">
										<p className="text-sm text-muted-foreground">
											Tu n'as pas reçu l'email ou le lien a expiré ?
										</p>
									</div>
									<ResendVerificationEmailForm />
								</div>

								<div className="text-center pt-2 space-y-2">
									<Button asChild variant="outline" className="w-full">
										<Link href="/connexion">Retour à la connexion</Link>
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
