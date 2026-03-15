import { AuthPageLayout } from "@/modules/auth/components/auth-page-layout";
import { ResendVerificationEmailForm } from "@/modules/auth/components/resend-verification-email-form";
import { Button } from "@/shared/components/ui/button";
import { auth } from "@/modules/auth/lib/auth";
import { ajAuth } from "@/shared/lib/arcjet";
import { getBaseUrl } from "@/shared/constants/urls";
import { fraunces } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
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

	// Check if user is connected
	const session = await getSession();
	const isConnected = !!session?.user;

	// If connected with no token/error, they've just been verified
	if (isConnected && !token && !error) {
		isSuccess = true;
	}
	// URL error
	else if (error === "INVALID_TOKEN") {
		errorMessage = "Le lien de vérification est invalide ou a expiré.";
	}
	// Attempt verification with token
	else if (token) {
		const result = await verifyEmailToken(token);
		if (result.success) {
			isSuccess = true;
		} else if ("rateLimited" in result && result.rateLimited) {
			errorMessage = "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
		} else {
			errorMessage = "Le lien de vérification est invalide ou a expiré.";
		}
	}
	// No token
	else {
		errorMessage = "Token de vérification manquant.";
	}

	if (isSuccess) {
		return (
			<AuthPageLayout
				backHref="/"
				backLabel="Retour au site"
				title="Bienvenue"
				icon={
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
						<Sparkles className="h-8 w-8 text-green-600" aria-hidden="true" />
					</div>
				}
			>
				<div className="space-y-6">
					<div
						className="flex flex-col items-center gap-4 rounded-md border border-green-500/30 bg-green-500/15 p-6"
						role="status"
						aria-live="polite"
					>
						<CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden="true" />
						<div className="space-y-2 text-center">
							<p className={cn("text-lg font-normal text-green-700", fraunces.className)}>
								Email vérifié avec succès
							</p>
							<p className="text-sm text-green-600/90">
								{isConnected
									? "Votre compte a été activé et vous êtes connecté."
									: "Votre compte a été activé. Vous pouvez maintenant vous connecter."}
							</p>
						</div>
					</div>

					<div className="flex flex-col gap-3">
						<Button asChild className="w-full">
							<Link href="/boutique">Découvrir nos collections</Link>
						</Button>
						<Button asChild variant="outline" className="w-full">
							<Link href={isConnected ? "/" : "/connexion"}>
								{isConnected ? "Retour au site" : "Se connecter"}
							</Link>
						</Button>
					</div>
				</div>
			</AuthPageLayout>
		);
	}

	return (
		<AuthPageLayout
			backHref="/"
			backLabel="Retour au site"
			title="Vérification d'email"
			icon={
				<div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
					<AlertCircle className="text-destructive h-8 w-8" aria-hidden="true" />
				</div>
			}
		>
			<div className="space-y-6">
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

				{/* Resend form */}
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
		</AuthPageLayout>
	);
}
