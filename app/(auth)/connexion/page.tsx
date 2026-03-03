import { AuthPageLayout } from "@/modules/auth/components/auth-page-layout";
import { SignInEmailForm } from "@/modules/auth/components/sign-in-email-form";
import { SignInSocialForm } from "@/modules/auth/components/sign-in-social-form";
import { SignUpLink } from "@/modules/auth/components/sign-up-link";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Connexion | Synclune",
	description:
		"Connectez-vous à votre espace personnel Synclune pour accéder à vos commandes, favoris et informations.",
	robots: { index: false, follow: false },
	openGraph: {
		title: "Connexion | Synclune",
		description: "Accédez à votre espace personnel",
		type: "website",
	},
};

export default function LoginPage() {
	return (
		<AuthPageLayout
			backHref="/"
			backLabel="Retour au site"
			title="Connexion"
			description="Pour accéder à votre espace personnel"
		>
			<div className="space-y-6">
				{/* Social login */}
				<Suspense>
					<SignInSocialForm />
				</Suspense>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-background text-muted-foreground px-2">Ou avec votre email</span>
					</div>
				</div>

				{/* Email login */}
				<Suspense>
					<SignInEmailForm />
				</Suspense>

				{/* Sign up link */}
				<div className="border-t pt-4 text-center">
					<Suspense>
						<SignUpLink />
					</Suspense>
				</div>
			</div>
		</AuthPageLayout>
	);
}
