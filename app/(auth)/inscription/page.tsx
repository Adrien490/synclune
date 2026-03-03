import { AuthPageLayout } from "@/modules/auth/components/auth-page-layout";
import { SignInSocialForm } from "@/modules/auth/components/sign-in-social-form";
import { SignUpEmailForm } from "@/modules/auth/components/sign-up-email-form";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Inscription | Synclune",
	description:
		"Créez votre compte Synclune pour découvrir nos créations uniques et accéder à votre espace personnel.",
	robots: { index: false, follow: false },
	openGraph: {
		title: "Inscription | Synclune",
		description: "Rejoignez Synclune et découvrez nos créations",
		type: "website",
	},
};

export default function SignupPage() {
	return (
		<AuthPageLayout
			backHref="/"
			backLabel="Retour au site"
			title="Inscription"
			description="Rejoignez l'univers Synclune et découvrez des créations d'exception."
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
						<span className="bg-background text-muted-foreground px-2">Ou créez votre compte</span>
					</div>
				</div>

				{/* Email sign up */}
				<Suspense>
					<SignUpEmailForm />
				</Suspense>

				{/* Login link */}
				<div className="border-t pt-4 text-center">
					<div className="text-muted-foreground text-sm">
						Vous avez déjà un compte ?{" "}
						<Link href="/connexion" className="font-medium underline">
							Connectez-vous
						</Link>
					</div>
				</div>
			</div>
		</AuthPageLayout>
	);
}
