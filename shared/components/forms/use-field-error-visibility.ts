"use client";

import { useStore, type AnyFieldApi } from "@tanstack/react-form";

/**
 * Gate d'affichage des erreurs de champ : une erreur n'est montrée qu'une fois
 * le champ quitté (`meta.isBlurred`) ou une soumission tentée
 * (`submissionAttempts > 0`).
 *
 * Pourquoi : la quasi-totalité des formulaires valident en `onChange` — sans ce
 * gate, taper « J » dans « Nom » affichait aussitôt « au moins 2 caractères »,
 * et la live region `role="alert"` de `FieldError` re-vocalisait le message à
 * chaque frappe. Défaut identifié à l'audit checkout 2026-07-26 (F1), corrigé
 * là-bas par une `revalidateLogic` locale au tunnel ; généralisé ici côté
 * AFFICHAGE pour couvrir les ~44 formulaires restés en `onChange` sans toucher
 * à leurs validators (audit InputField 2026-08-03, P1-1).
 *
 * La validation elle-même n'est PAS différée : les validators tournent à chaque
 * frappe et `canSubmit` reste exact. Seul l'affichage l'est — `aria-invalid`,
 * `data-invalid` et les `errors` passés à `FieldError` doivent tous dériver de
 * ce booléen, sinon le lecteur d'écran et le CSS divergent du visuel.
 *
 * À la soumission, `form.handleSubmit()` valide tous les champs et incrémente
 * `submissionAttempts` : les erreurs des champs jamais visités apparaissent, et
 * `use-focus-first-error` retrouve son `[aria-invalid="true"]`.
 *
 * Une fois blurré, `isBlurred` reste vrai : l'erreur s'efface au fil de la
 * correction (les validators `onChange` continuent de tourner). Corollaire
 * assumé : les contrôles qui ne câblent pas `handleBlur` (radio, multi-select,
 * autocomplete) ne révèlent leurs erreurs qu'à la soumission — leur erreur
 * type est « champ requis », qui n'a pas de sens avant.
 *
 * ## `announce` : qui a le droit de PARLER
 *
 * `visible` dit si l'erreur s'affiche ; `announce` dit si sa région live a le
 * droit de la vocaliser. Les deux divergent exactement dans un cas : **après une
 * tentative de soumission**.
 *
 * Mesuré sur `/paiement` le 2026-08-07, formulaire vide soumis : **sept** régions
 * live se peuplaient dans le même tick — le résumé d'erreurs en `assertive` plus
 * une `role="alert"` par champ invalide — pendant que le focus se déplaçait. Un
 * lecteur d'écran interrompt les `polite` avec l'`assertive` et bouscule les
 * `polite` entre elles : la vocalisation est brouillée au moment précis où
 * l'utilisateur a besoin d'être guidé.
 *
 * D'où la règle : **hors soumission, le champ parle** (rien d'autre ne le ferait,
 * l'utilisateur ayant déjà quitté le champ) ; **à la soumission, il se tait** —
 * le message est alors porté soit par le résumé d'erreurs, soit par le
 * déplacement du focus vers le premier champ invalide, dont le nom accessible et
 * l'`aria-describedby` sont lus à l'arrivée. Dans les deux cas le message est
 * transmis, une seule fois.
 *
 * ⚠️ Ne PAS rendre `announce` toujours vrai « pour être sûr » : c'est la
 * redondance elle-même qui rend l'ensemble inaudible.
 */
export interface FieldErrorVisibility {
	/** L'erreur est affichée (pilote `aria-invalid`, `data-invalid`, le contenu). */
	visible: boolean;
	/** La région live du champ a le droit de vocaliser (cf. docblock). */
	announce: boolean;
}

export function useFieldErrorVisibility(field: AnyFieldApi): FieldErrorVisibility {
	const submissionAttempts = useStore(field.form.store, (state) => state.submissionAttempts);
	const { errors, isBlurred } = field.state.meta;
	const visible = (isBlurred || submissionAttempts > 0) && errors.length > 0;

	return { visible, announce: visible && submissionAttempts === 0 };
}
