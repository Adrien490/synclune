"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { LoaderCircle, ScrollText } from "lucide-react";
import { acceptTerms } from "@/modules/users/actions/accept-terms";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

/**
 * Bandeau d'acceptation CGV + politique de confidentialité (RGPD-AUDIT P1-3).
 *
 * Affiché dans l'espace compte tant que `User.termsAcceptedAt` est NULL —
 * cas des comptes créés via OAuth (Google), dont le flux d'inscription ne
 * passe pas par la case à cocher du formulaire email/password.
 */
export function AcceptTermsBanner() {
	const [checked, setChecked] = useState(false);
	const [, action, isPending] = useActionState(
		withCallbacks(acceptTerms, createToastCallbacks()),
		undefined,
	);

	return (
		<Alert>
			<ScrollText className="size-4" />
			<AlertTitle>Conditions générales et confidentialité</AlertTitle>
			<AlertDescription className="space-y-3">
				<p>
					Votre compte a été créé via un fournisseur externe : merci de prendre connaissance de nos{" "}
					<Link href="/cgv" target="_blank" className="font-medium underline">
						conditions générales de vente
					</Link>{" "}
					et de notre{" "}
					<Link href="/confidentialite" target="_blank" className="font-medium underline">
						politique de confidentialité
					</Link>
					.
				</p>
				<form action={action} className="flex flex-wrap items-center gap-3">
					<label
						htmlFor="accept-terms-checkbox"
						className="flex cursor-pointer items-center gap-2 text-sm"
					>
						<Checkbox
							id="accept-terms-checkbox"
							checked={checked}
							onCheckedChange={(value) => setChecked(value === true)}
							disabled={isPending}
						/>
						J&apos;accepte les CGV et la politique de confidentialité
					</label>
					<Button type="submit" size="sm" disabled={!checked || isPending}>
						{isPending && <LoaderCircle className="animate-spin" />}
						{isPending ? "Enregistrement…" : "Confirmer"}
					</Button>
				</form>
			</AlertDescription>
		</Alert>
	);
}
