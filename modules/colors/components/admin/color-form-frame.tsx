"use client";

import { Loader2 } from "lucide-react";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { Button } from "@/shared/components/ui/button";
import { Kbd } from "@/shared/components/ui/kbd";
import { useHaptic } from "@/shared/hooks/use-haptic";

import type { ColorFormInstance } from "../../hooks/use-color-form";

const FIELD_LABELS: Record<string, string> = {
	name: "Nom",
	hex: "Couleur",
	description: "Description",
};

/**
 * Récapitulatif d'erreurs partagé entre create-color-form et edit-color-form.
 * N'apparaît qu'après une tentative de soumission et seulement si ≥ 2 champs
 * sont invalides (sinon l'erreur inline du champ suffit).
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
				if (fieldErrors.length < 2) return null;
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
 * edit-color-form. Sticky bottom mobile (via AdminFormFooter), hint clavier ⌘S
 * desktop, spinner pending, haptic medium au clic. `disabled` reflète
 * `canSubmit` via Subscribe pour rester réactif sans re-render global.
 */
export function ColorFormSubmit({
	form,
	isPending,
	idleLabel,
	pendingLabel,
}: ColorFormSubmitProps) {
	const haptic = useHaptic();
	return (
		<form.AppForm>
			<AdminFormFooter pending={isPending}>
				<form.Subscribe selector={(state) => [state.canSubmit] as const}>
					{([canSubmit]) => (
						<div className="flex justify-end">
							<Button
								type="submit"
								size="input"
								disabled={!canSubmit || isPending}
								onClick={() => haptic("medium")}
								className="w-full sm:w-auto sm:min-w-56"
							>
								{isPending && (
									<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
								)}
								<span>{isPending ? pendingLabel : idleLabel}</span>
								{!isPending && (
									<Kbd
										aria-hidden="true"
										className="ml-1 hidden bg-white/15 text-white/80 lg:inline-flex"
									>
										⌘S
									</Kbd>
								)}
							</Button>
						</div>
					)}
				</form.Subscribe>
			</AdminFormFooter>
		</form.AppForm>
	);
}
