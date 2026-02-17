import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/page-header";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import { ChangePasswordForm } from "@/modules/users/components/change-password-form";
import { ProfileForm } from "@/modules/users/components/profile-form";
import { GdprSection } from "@/modules/users/components/gdpr-section";
import { NewsletterSettingsCard } from "@/modules/newsletter/components/newsletter-settings-card";
import { ActiveSessionsCard } from "@/modules/auth/components/active-sessions-card";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { getUserAccounts } from "@/modules/users/data/get-user-accounts";
import { getSubscriptionStatus } from "@/modules/newsletter/data/get-subscription-status";
import { getUserSessions } from "@/modules/auth/data/get-user-sessions";
import { Button } from "@/shared/components/ui/button";
import { KeyRound, LogOut, User } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Paramètres du compte | Synclune",
	description: "Gérez les paramètres de votre compte",
	robots: {
		index: false,
		follow: true,
	},
};

export default async function SettingsPage() {
	const [user, accounts, newsletterStatus, sessions] = await Promise.all([
		getCurrentUser(),
		getUserAccounts(),
		getSubscriptionStatus(),
		getUserSessions(),
	]);

	const hasPasswordAccount = accounts.some(
		(account) => account.providerId === "credential"
	);

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Paramètres"
				description="Gérez vos informations personnelles et la sécurité de votre compte"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Paramètres", href: "/parametres" },
				]}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid gap-6 lg:grid-cols-3">
						{/* Colonne principale - 2/3 */}
						<div className="lg:col-span-2 space-y-6">
							{/* Profil */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<User className="w-5 h-5" />
										Informations personnelles
									</CardTitle>
									<CardDescription>
										Modifiez vos informations de profil
									</CardDescription>
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
										<CardDescription>
											Gérez votre mot de passe et la sécurité de votre compte
										</CardDescription>
									</CardHeader>
									<CardContent>
										<ChangePasswordForm />
									</CardContent>
								</Card>
							)}

							{/* Sessions actives */}
							<ActiveSessionsCard sessions={sessions} />
						</div>

						{/* Sidebar contenu - 1/3 */}
						<div className="space-y-6">
							{/* Session */}
							<Card>
								<CardHeader>
									<CardTitle className="text-lg flex items-center gap-2">
										<LogOut className="w-5 h-5" />
										Session
									</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-sm text-muted-foreground mb-4">
										Déconnectez-vous de votre compte sur cet appareil
									</p>
									<LogoutAlertDialog>
										<Button variant="outline" className="w-full">
											<LogOut className="w-4 h-4 mr-2" />
											Se déconnecter
										</Button>
									</LogoutAlertDialog>
								</CardContent>
							</Card>

							{/* Newsletter */}
							<NewsletterSettingsCard
								isSubscribed={newsletterStatus.isSubscribed}
							/>

							{/* RGPD */}
							<GdprSection />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
