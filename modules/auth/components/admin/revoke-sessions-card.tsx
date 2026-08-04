"use client";

import { ShieldWarningIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { revokeAllSessions } from "../../actions/revoke-all-sessions";

/**
 * Bouton « Déconnecter tous mes appareils ».
 *
 * La copie annonce **« dans la minute »** et non « immédiatement » : Better Auth
 * sert la session depuis son cookie-cache signé sans lecture en base, donc les
 * autres navigateurs conservent l'accès jusqu'à l'expiration de ce cache
 * (`AUTH_SESSION_CONFIG.cookieCache.maxAge`, 60 s). Promettre l'immédiateté
 * serait faux, et sur une action de sécurité c'est le pire endroit pour arrondir.
 */
export function RevokeSessionsCard() {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);

	const [, formAction, isPending] = useActionState(
		withCallbacks(
			revokeAllSessions,
			createToastCallbacks({
				loadingMessage: "Révocation des sessions…",
				onSuccess: () => {
					setIsOpen(false);
					// La session courante vient d'être révoquée elle aussi : rester sur
					// /admin afficherait une page morte jusqu'au prochain rendu serveur.
					router.replace(ROUTES.AUTH.SIGN_IN);
				},
			}),
		),
		undefined,
	);

	return (
		<section
			aria-labelledby="revoke-sessions-heading"
			className="border-border bg-card rounded-xl border p-6"
		>
			<div className="flex items-start gap-3">
				<div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
					<ShieldWarningIcon className="text-muted-foreground size-5" aria-hidden="true" />
				</div>
				<div className="space-y-1">
					<h2 id="revoke-sessions-heading" className="font-medium">
						Déconnecter tous mes appareils
					</h2>
					<p className="text-muted-foreground text-sm">
						Ferme toutes tes sessions ouvertes, y compris celle-ci. À utiliser si tu penses
						qu&apos;un appareil t&apos;a été volé ou qu&apos;une connexion t&apos;échappe. Tu devras
						te reconnecter.
					</p>
				</div>
			</div>

			<div className="mt-4 flex justify-end">
				<Button
					type="button"
					variant="destructive"
					className="min-h-11"
					onClick={() => setIsOpen(true)}
				>
					Déconnecter tous mes appareils
				</Button>
			</div>

			<ResponsiveAlertDialog
				open={isOpen}
				onOpenChange={(open) => {
					if (!open && !isPending) setIsOpen(false);
				}}
				tone="destructive"
			>
				<ResponsiveAlertDialogContent>
					<form action={formAction}>
						<ResponsiveAlertDialogHeader>
							<ResponsiveAlertDialogTitle>
								Déconnecter tous les appareils
							</ResponsiveAlertDialogTitle>
							<ResponsiveAlertDialogDescription>
								Toutes tes sessions vont être fermées, celle-ci comprise, et tu seras renvoyée vers
								la page de connexion.
								<span className="text-foreground mt-2 block text-sm">
									Les autres appareils perdent l&apos;accès <strong>dans la minute</strong>, pas
									instantanément.
								</span>
							</ResponsiveAlertDialogDescription>
						</ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogFooter>
							<ResponsiveAlertDialogCancel
								disabled={isPending}
								className="min-h-11 transition-transform duration-150 active:scale-[0.98]"
							>
								Annuler
							</ResponsiveAlertDialogCancel>
							<ResponsiveAlertDialogAction
								type="submit"
								disabled={isPending}
								aria-busy={isPending}
								className="min-h-11 transition-transform duration-150 active:scale-[0.98]"
							>
								{isPending && <Spinner presentational className="mr-2" />}
								{isPending ? "Révocation…" : "Tout déconnecter"}
							</ResponsiveAlertDialogAction>
						</ResponsiveAlertDialogFooter>
					</form>
				</ResponsiveAlertDialogContent>
			</ResponsiveAlertDialog>
		</section>
	);
}
