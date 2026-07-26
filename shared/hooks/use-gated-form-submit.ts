"use client";

import { runAfterValidation } from "@/shared/utils/run-after-validation";

/**
 * Surface minimale d'une instance TanStack Form consommée par le gate.
 * Typage structurel volontaire : les instances `useAppForm` ont des génériques
 * distincts par formulaire, seul ce contrat nous intéresse ici.
 */
interface GatedForm {
	handleSubmit: () => Promise<void>;
	readonly state: { readonly isValid: boolean; readonly isSubmitting: boolean };
}

interface UseGatedFormSubmitOptions {
	/** Instance créée par `useAppForm`. */
	form: GatedForm;
	/** Dispatcher du Server Action (`useActionState`). */
	action: (formData: FormData) => void;
	/** Pending du `useActionState`. */
	isPending: boolean;
	/** Focus du premier champ invalide — cf. `useFocusFirstError`. */
	focusFirstInvalid: () => boolean | void;
	/** Nom du formulaire, pour identifier la trace en cas de validateur qui throw. */
	context: string;
	/** Occupation supplémentaire bloquante (upload média en vol, etc.). */
	extraBusy?: boolean;
}

/**
 * Contrat de soumission des formulaires adossés à un Server Action.
 *
 * Retourne le `onSubmit` à poser sur le `<form>`. Il :
 *
 * 1. **coupe systématiquement la soumission native** (`preventDefault`) — sans ça,
 *    React déclenche la prop `action` du `<form>` AVANT que la validation TanStack
 *    (asynchrone) ait rendu son verdict : l'action partait donc même sur un
 *    formulaire invalide. Sur `/connexion` c'était une tentative consommée sur les
 *    5 autorisées par 15 min (le rate limit précède la validation côté action),
 *    donc un vrai risque de lockout à cause de fautes de frappe ;
 * 2. **bloque les resoumissions en vol** — `disabled` sur le bouton ne couvre pas
 *    la touche Entrée, et `useActionState` sérialise les dispatchs au lieu de les
 *    ignorer (⇒ doublons : deux adresses créées, deux demandes d'e-mail, etc.) ;
 * 3. valide, puis dispatche l'action avec le `FormData` **capturé avant l'await**
 *    (un `fieldset disabled` posé pendant le pending exclurait sinon les champs) ;
 * 4. à défaut, focus le premier champ invalide (WCAG 3.3.1).
 *
 * La prop `action={action}` reste utile sur le `<form>` : elle conserve le chemin
 * sans JS (progressive enhancement), simplement inerte quand ce handler tourne.
 *
 * @example
 * ```tsx
 * const { formRef, focusFirstInvalid } = useFocusFirstError();
 * const onSubmit = useGatedFormSubmit({
 *   form, action, isPending, focusFirstInvalid, context: "SignInEmailForm",
 * });
 *
 * <form ref={formRef} action={action} onSubmit={onSubmit}>…</form>
 * ```
 */
export function useGatedFormSubmit({
	form,
	action,
	isPending,
	focusFirstInvalid,
	context,
	extraBusy = false,
}: UseGatedFormSubmitOptions): React.FormEventHandler<HTMLFormElement> {
	return (event) => {
		event.preventDefault();
		if (isPending || extraBusy || form.state.isSubmitting) return;

		const formData = new FormData(event.currentTarget);

		runAfterValidation(
			form.handleSubmit(),
			() => {
				if (form.state.isValid) {
					action(formData);
				} else {
					requestAnimationFrame(() => focusFirstInvalid());
				}
			},
			context,
		);
	};
}
