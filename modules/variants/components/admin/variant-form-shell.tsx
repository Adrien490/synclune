"use client";

import type { ReactNode, RefObject } from "react";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { runAfterValidation } from "@/shared/utils/run-after-validation";

import type { VariantFormInstance, VariantFormSharedProps } from "./variant-form-types";
import { VariantSidebarCards } from "./variant-sidebar-cards";

/**
 * Libellés des champs pour le récapitulatif d'erreurs — SSOT des deux
 * formulaires (ils en portaient chacun une copie mot pour mot).
 */
const FIELD_LABELS: Record<string, string> = {
	colorId: "Couleur",
	materialId: "Matériau",
	size: "Taille",
	active: "Disponibilité",
	priceEuros: "Prix de vente",
	stock: "Stock",
};

/**
 * Champs pouvant recevoir une erreur serveur path-préfixée (« size: Trop long »)
 * émise par `create-variant.ts` / `update-variant.ts`.
 */
export const VARIANT_SERVER_FIELD_NAMES = [
	"priceEuros",
	"stock",
	"size",
	"colorId",
	"materialId",
] as const;

interface VariantFormShellProps {
	form: VariantFormInstance;
	action: (formData: FormData) => void;
	isPending: boolean;
	serverErrors: React.ComponentProps<typeof FormServerErrorAlert>["errors"];
	ariaLabel: string;
	/** Champs cachés propres au formulaire (productId, variantId, originalStock…). */
	hiddenFields: ReactNode;
	idleLabel: string;
	pendingLabel: string;
	colors: VariantFormSharedProps["colors"];
	materials: VariantFormSharedProps["materials"];
	viewTransitionPrefix: "variant-create" | "variant-edit";
	formRef: RefObject<HTMLFormElement | null>;
	focusFirstInvalid: () => void;
	onInvalidCapture: React.FormEventHandler<HTMLFormElement>;
}

/**
 * Coque commune des formulaires de variante (création et édition).
 *
 * ⚠️ Ce composant DÉCIDE — il n'emballe pas. Il possède la séquence de soumission
 * (validation TanStack puis `action`, sinon focus sur le premier champ invalide),
 * le récapitulatif d'erreurs et l'ordre des sections. Les deux formulaires en
 * portaient chacun leur copie : ~120 lignes strictement identiques, `FIELD_LABELS`
 * et le bloc `Subscribe`/`ErrorSummary` compris. Ce qui reste propre à chacun —
 * champs cachés, libellés du bouton, hook d'action — passe en props.
 */
export function VariantFormShell({
	form,
	action,
	isPending,
	serverErrors,
	ariaLabel,
	hiddenFields,
	idleLabel,
	pendingLabel,
	colors,
	materials,
	viewTransitionPrefix,
	formRef,
	focusFirstInvalid,
	onInvalidCapture,
}: VariantFormShellProps) {
	return (
		<form
			ref={formRef}
			aria-label={ariaLabel}
			aria-busy={isPending}
			className="space-y-6"
			onSubmit={(event) => {
				event.preventDefault();
				if (isPending || form.state.isSubmitting) return;
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
					ariaLabel,
				);
			}}
			onInvalidCapture={onInvalidCapture}
		>
			{hiddenFields}

			{/* Les champs pilotés par des composants (radio, selects) ne posent pas de
			    valeur dans le FormData : on les mirroir en champs cachés. */}
			<form.Subscribe
				selector={(state: {
					values: { active: "true" | "false"; colorId: string; materialId: string };
				}) => ({
					active: state.values.active,
					colorId: state.values.colorId,
					materialId: state.values.materialId,
				})}
			>
				{({ active, colorId, materialId }) => (
					<>
						<input type="hidden" name="active" value={String(active)} />
						<input type="hidden" name="colorId" value={colorId} />
						<input type="hidden" name="materialId" value={materialId} />
					</>
				)}
			</form.Subscribe>

			<FormServerErrorAlert errors={serverErrors} />

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

			<RequiredFieldsNote />

			<fieldset disabled={isPending} className="space-y-6">
				<VariantSidebarCards
					form={form}
					colors={colors}
					materials={materials}
					viewTransitionPrefix={viewTransitionPrefix}
				/>
			</fieldset>

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
		</form>
	);
}
