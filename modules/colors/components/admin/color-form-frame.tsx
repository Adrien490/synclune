"use client";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { ErrorSummary } from "@/shared/components/forms/error-summary";

import type { ColorFormInstance } from "../../hooks/use-color-form";

const FIELD_LABELS: Record<string, string> = {
	name: "Nom",
	hex: "Couleur",
	description: "Description",
};

/**
 * Récapitulatif d'erreurs partagé entre create-color-form et edit-color-form.
 * N'apparaît qu'après une tentative de soumission, dès le premier champ
 * invalide (deep-link scroll+focus, WCAG 3.3.1).
 */
export function ColorFormErrorSummary({ form }: { form: ColorFormInstance }) {
	return (
		<form.Subscribe
			selector={(state) => ({
				submissionAttempts: state.submissionAttempts,
				fieldMeta: state.fieldMeta,
			})}
		>
			{({ submissionAttempts, fieldMeta }) => {
				if (!submissionAttempts) return null;
				const fieldErrors = Object.entries(
					fieldMeta as Record<string, { errors?: Array<string | undefined> }>,
				)
					.map(([name, meta]) => {
						const first = meta.errors?.find((e): e is string => Boolean(e));
						return first ? { name, label: FIELD_LABELS[name] ?? name, message: first } : null;
					})
					.filter(
						(item): item is { name: string; label: string; message: string } => item !== null,
					);
				if (fieldErrors.length === 0) return null;
				return <ErrorSummary fieldErrors={fieldErrors} />;
			}}
		</form.Subscribe>
	);
}

interface ColorFormSubmitProps {
	form: ColorFormInstance;
	isPending: boolean;
	/** Libellé du bouton au repos (« Créer la couleur » / « Enregistrer »). */
	idleLabel: string;
	/** Libellé pendant la soumission (« Création… » / « Mise à jour… »). */
	pendingLabel: string;
}

/**
 * Footer + bouton de soumission partagé entre create-color-form et
 * edit-color-form. Sticky bottom mobile (via AdminFormFooter), délègue le
 * contrat submit (canSubmit + isPending + aria-busy + spinner + ⌘S + haptique)
 * au `form.SubmitButton` partagé.
 */
export function ColorFormSubmit({
	form,
	isPending,
	idleLabel,
	pendingLabel,
}: ColorFormSubmitProps) {
	return (
		<form.AppForm>
			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<form.SubmitButton
						isPending={isPending}
						idleLabel={idleLabel}
						pendingLabel={pendingLabel}
						showKbdHint
						className="w-full sm:w-auto sm:min-w-56"
					/>
				</div>
			</AdminFormFooter>
		</form.AppForm>
	);
}
