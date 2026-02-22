"use client";

import { useState } from "react";
import { LockKeyhole, Lock, CircleCheck } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ChangePasswordDialog } from "./change-password-dialog";
import { ResendVerificationButton } from "./resend-verification-button";

interface SecuritySectionProps {
	emailVerified: boolean;
	providers: string[];
	email: string;
}

const PROVIDER_LABELS: Record<string, string> = {
	google: "Google",
	github: "GitHub",
};

export function SecuritySection({
	emailVerified,
	providers,
	email,
}: SecuritySectionProps) {
	const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

	const hasCredential = providers.includes("credential");
	const oauthProviders = providers.filter((p) => p !== "credential");

	return (
		<>
			<section className="space-y-4">
				<div>
					<h2 className="text-base font-semibold flex items-center gap-2">
						<LockKeyhole className="size-4 text-muted-foreground" />
						Sécurité
					</h2>
					<p className="text-sm text-muted-foreground mt-0.5">
						Gérez votre mot de passe et vos méthodes de connexion
					</p>
				</div>
				<div className="border-t border-border/60 pt-4 space-y-6">
					{hasCredential && (
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium">Mot de passe</p>
								<p className="text-sm text-muted-foreground">
									Modifier votre mot de passe de connexion
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPasswordDialogOpen(true)}
							>
								<Lock className="w-4 h-4 mr-2" aria-hidden="true" />
								Modifier
							</Button>
						</div>
					)}

					{emailVerified ? (
						<div className="flex items-center gap-2">
							<CircleCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
							<p className="text-sm text-muted-foreground">
								Email vérifiée
							</p>
						</div>
					) : (
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium">
									Vérification de l&apos;email
								</p>
								<p className="text-sm text-muted-foreground">
									Votre adresse email n&apos;est pas encore
									vérifiée
								</p>
							</div>
							<ResendVerificationButton email={email} />
						</div>
					)}

					{oauthProviders.length > 0 && (
						<div className="space-y-2">
							<p className="text-sm font-medium">
								Comptes connectés
							</p>
							<div className="flex gap-2">
								{oauthProviders.map((provider) => (
									<Badge key={provider} variant="secondary">
										{PROVIDER_LABELS[provider] ?? provider}
									</Badge>
								))}
							</div>
						</div>
					)}
				</div>
			</section>

			<ChangePasswordDialog
				open={passwordDialogOpen}
				onOpenChange={setPasswordDialogOpen}
			/>
		</>
	);
}
