import { PageHeader } from "@/shared/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import { ChangePasswordForm } from "@/modules/users/components/change-password-form";
import { ProfileForm } from "@/modules/users/components/profile-form";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { getUserAccounts } from "@/modules/users/data/get-user-accounts";
import { KeyRound, LogOut, User } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Paramètres du compte | Synclune",
	description: "Gérez les paramètres de votre compte",
	robots: {
		index: false,
		follow: true,
	},
};

export default async function SettingsPage() {
	const [user, accounts] = await Promise.all([
		getCurrentUser(),
		getUserAccounts(),
	]);

	// Vérifier si l'utilisateur a un compte email/password
	const hasPasswordAccount = accounts.some(
		(account) => account.providerId === "credential"
	);

	const breadcrumbs = [
		{ label: "Mon compte", href: "/account" },
		{ label: "Paramètres", href: "/account/settings" },
	];

	return (
		<div className="min-h-screen relative">
			{/* Background minimal - Pages fonctionnelles */}
			<ParticleSystem variant="minimal" className="fixed inset-0 z-0" />

			<PageHeader
				title="Paramètres du compte"
				description="Gérez vos informations personnelles et la sécurité de votre compte"
				breadcrumbs={breadcrumbs}
			/>

			<section className="bg-background py-8 relative z-10">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Profil */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="w-5 h-5" />
								Informations personnelles
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ProfileForm user={user} />
						</CardContent>
					</Card>

					{/* Sécurité - Uniquement si compte email/password */}
					{hasPasswordAccount && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<KeyRound className="w-5 h-5" />
									Sécurité
								</CardTitle>
							</CardHeader>
							<CardContent>
								<ChangePasswordForm />
							</CardContent>
						</Card>
					)}

					{/* Déconnexion */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<LogOut className="w-5 h-5" />
								Session
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground mb-4">
								Déconnectez-vous de votre compte sur cet appareil
							</p>
							<LogoutButton />
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
