"use client";

import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Heart, Mail, Sparkles, Star } from "lucide-react";
import { useRouter } from "next/navigation";

export const NEWSLETTER_SUCCESS_DIALOG_ID = "newsletter-success";

/**
 * Dialog de succès pour l'inscription à la newsletter
 *
 * Utilise le store AlertDialog pour gérer l'état global
 * Affiche un message de bienvenue chaleureux avec les avantages de la newsletter
 */
export function NewsletterSuccessDialog() {
	const router = useRouter();
	const dialog = useAlertDialog(NEWSLETTER_SUCCESS_DIALOG_ID);

	const handleViewProducts = () => {
		dialog.close();
		router.push("/products");
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			dialog.close();
		}
	};

	return (
		<ResponsiveDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="max-w-md">
				<div className="text-center space-y-6 py-4">
					{/* Animation d'icône */}
					<div className="flex justify-center">
						<div className="relative inline-flex items-center justify-center">
							<Sparkles className="w-16 h-16 text-primary animate-pulse" />
						</div>
					</div>

					{/* Titre */}
					<div className="space-y-2">
						<ResponsiveDialogTitle className="text-2xl font-serif text-foreground">
							Bienvenue dans l'aventure ! ✨
						</ResponsiveDialogTitle>
						<ResponsiveDialogDescription className="text-base text-muted-foreground">
							Merci ! Je suis contente de te compter parmi mes abonnés.
						</ResponsiveDialogDescription>
					</div>

					{/* Message */}
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Dans ma newsletter, je partage :
						</p>

						{/* Liste des avantages */}
						<ul className="space-y-3 text-left max-w-sm mx-auto list-none">
							<li className="flex items-start gap-3">
								<Heart className="w-5 h-5 text-primary mt-0.5 shrink-0" />
								<span className="text-sm text-foreground">
									Mes nouvelles créations avant tout le monde
								</span>
							</li>
							<li className="flex items-start gap-3">
								<Star className="w-5 h-5 text-gold mt-0.5 shrink-0" />
								<span className="text-sm text-foreground">
									Des petites offres sympas pour les abonnés
								</span>
							</li>
							<li className="flex items-start gap-3">
								<Mail className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
								<span className="text-sm text-foreground">
									Les coulisses de l'atelier
								</span>
							</li>
						</ul>
					</div>

					{/* Actions */}
					<div className="flex flex-col sm:flex-row gap-3 pt-4">
						<Button onClick={handleViewProducts} className="flex-1" size="lg">
							Découvrir les créations
						</Button>
						<Button
							onClick={dialog.close}
							variant="outline"
							className="flex-1"
							size="lg"
						>
							Continuer la navigation
						</Button>
					</div>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
