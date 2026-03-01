import { LogoAnimated } from "@/shared/components/logo-animated";
import { Button } from "@/shared/components/ui/button";
import { ResendVerificationEmailForm } from "@/modules/auth/components/resend-verification-email-form";
import { auth } from "@/modules/auth/lib/auth";
import { ajAuth } from "@/shared/lib/arcjet";
import { getBaseUrl } from "@/shared/constants/urls";
import { cormorantGaramond } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/modules/auth/lib/get-current-session";

export const metadata: Metadata = {
	title: "Vérification de l'email | Synclune",
	description: "Vérifiez votre adresse email pour activer votre compte Synclune.",
	robots: { index: false, follow: false },
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
		const request = new Request(`${getBaseUrl()}/verifier-email`, {
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

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
	const params = await searchParams;
	const token = params.token;
	const error = params.error;

	let errorMessage = "";
	let isSuccess = false;

	// Vérifier si l'utilisateur est connecté
	const session = await getSession();
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
			<div className="absolute top-4 left-4 z-20 sm:top-6 sm:left-6">
				<Link
					href="/"
					className="text-muted-foreground hover:text-foreground group -ml-2 inline-flex min-h-11 min-w-11 items-center gap-2 pl-2 text-sm transition-colors duration-200"
				>
					<ArrowLeft
						size={16}
						className="transition-transform duration-200 group-hover:-translate-x-1"
						aria-hidden="true"
					/>
					<span className="font-medium">Retour au site</span>
				</Link>
			</div>

			{/* Logo en haut à droite */}
			<div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
				<LogoAnimated size={44} preload href="/" />
			</div>

			{/* Contenu principal */}
			<div className="relative z-10 flex min-h-screen items-center justify-center p-4">
				<div className="w-full max-w-md space-y-8">
					{/* Header */}
					<div className="space-y-7 text-center">
						<div className="space-y-3">
							<h1
								className={cn(
									"text-foreground text-2xl font-semibold sm:text-3xl lg:text-4xl",
									cormorantGaramond.className,
								)}
							>
								Vérification d'email
							</h1>
						</div>
					</div>

					{/* État de la vérification */}
					<div className="space-y-6">
						{isSuccess ? (
							/* Message de succès */
							<div className="space-y-4">
								<div
									className="flex flex-col items-center gap-4 rounded-md border border-green-500/30 bg-green-500/15 p-6"
									role="status"
									aria-live="polite"
								>
									<CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden="true" />
									<div className="space-y-2 text-center">
										<p className="text-lg font-medium text-green-700">Email vérifié</p>
										<p className="text-sm text-green-600/90">
											{isConnected
												? "Votre compte a été activé et vous êtes connecté."
												: "Votre compte a été activé. Vous pouvez maintenant vous connecter."}
										</p>
									</div>
								</div>

								<div className="space-y-2 text-center">
									<Button asChild className="w-full">
										<Link href={isConnected ? "/" : "/connexion"}>
											{isConnected ? "Retour au site" : "Se connecter"}
										</Link>
									</Button>
								</div>
							</div>
						) : (
							/* Message d'erreur */
							<div className="space-y-4">
								<div
									className="bg-destructive/15 border-destructive/30 flex flex-col items-center gap-4 rounded-md border p-6"
									role="alert"
									aria-live="assertive"
								>
									<AlertCircle className="text-destructive h-12 w-12" aria-hidden="true" />
									<div className="space-y-2 text-center">
										<p className="text-destructive text-lg font-medium">
											{!token && !error ? "Lien incomplet" : "Erreur de vérification"}
										</p>
										<p className="text-destructive/90 text-sm">{errorMessage}</p>
									</div>
								</div>

								{/* Formulaire de renvoi d'email */}
								<div className="space-y-3">
									<div className="text-center">
										<p className="text-muted-foreground text-sm">
											Vous n'avez pas reçu l'email ou le lien a expiré ?
										</p>
									</div>
									<ResendVerificationEmailForm />
								</div>

								<div className="space-y-2 pt-2 text-center">
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
