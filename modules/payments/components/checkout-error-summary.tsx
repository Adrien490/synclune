"use client";

import { ErrorSummary, type ErrorSummaryField } from "@/shared/components/forms/error-summary";

interface CheckoutErrorSummaryProps {
	fieldErrors: ErrorSummaryField[];
}

/**
 * Réglage checkout du {@link ErrorSummary} partagé.
 *
 * ⚠️ **Ne PAS inliner**, malgré son corps d'une ligne — et sa JSDoc ne dit plus
 * « kept for backwards compatibility », ce qu'elle affirmait à tort jusqu'au
 * 2026-08-07. Ce fichier n'est pas un vestige : c'est l'ancrage d'un garde-fou
 * d'accessibilité. `single-announcement-on-submit.regression.test.tsx` lit ce
 * CHEMIN et vérifie qu'il porte `focusOnAppear` — le supprimer ferait rougir la
 * régression à la lecture du fichier, pas sur une assertion de rendu.
 *
 * ## `focusOnAppear` : le résumé est le CANAL UNIQUE d'annonce du tunnel
 *
 * Mesuré sur `/paiement` le 2026-08-07, formulaire vide soumis : sept régions
 * live se peuplaient dans le même tick — ce résumé en `assertive`, plus une
 * `role="alert"` par champ invalide — pendant que le focus partait vers le
 * premier champ. Le lecteur d'écran interrompt et bouscule : rien n'est
 * intelligible.
 *
 * Le tunnel adopte donc le motif canonique : les champs se taisent après une
 * soumission (`announce` de `useFieldErrorVisibility`), et **le résumé prend le
 * focus**. Il porte déjà un bouton de saut par erreur : depuis là, l'utilisateur
 * atteint n'importe quel champ fautif en une touche.
 */
export function CheckoutErrorSummary({ fieldErrors }: CheckoutErrorSummaryProps) {
	return <ErrorSummary fieldErrors={fieldErrors} ariaLive="assertive" focusOnAppear />;
}
