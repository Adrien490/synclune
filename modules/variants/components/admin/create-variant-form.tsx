"use client";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useCreateProductVariantForm } from "@/modules/variants/hooks/use-create-variant-form";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/view-transition";
import type { VariantFormSharedProps } from "./variant-form-types";
import { VariantSidebarCards } from "./variant-sidebar-cards";
import { runAfterValidation } from "@/shared/utils/run-after-validation";

const FIELD_LABELS: Record<string, string> = {
	colorId: "Couleur",
	materialId: "Matériau",
	size: "Taille",
	active: "Disponibilité",
	priceEuros: "Prix de vente",
	stock: "Stock",
};

// Champs pouvant recevoir une erreur serveur path-préfixée ("size: Trop long")
// émise par create-variant.ts / update-variant.ts (cf. CLAUDE.md § Validation patterns)
const SERVER_FIELD_NAMES = ["priceEuros", "stock", "size", "colorId", "materialId"] as const;

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function CreateProductVariantForm({
	colors,
	materials,
	product,
	productSlug,
}: VariantFormSharedProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const variantsListPath = `/admin/catalogue/produits/${productSlug}/variantes`;

	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const { form, state, action, isPending } = useCreateProductVariantForm({
		onSuccess: (message) => {
			haptic("success");
			allowNavigationRef.current?.();
			// Pas d'action : la ligne suivante navigue déjà vers `variantsListPath`,
			// exactement la destination que proposait « Voir les variantes ». Un bouton
			// qui rejoue la navigation qu'on vient d'effectuer est de la
			// sur-notification.
			toast.success(message || "Variante créée avec succès");
			navigateWithTransition(router, variantsListPath);
		},
	});

	const serverErrors = useServerFieldErrors({
		state,
		fieldNames: SERVER_FIELD_NAMES,
		setFieldError: (field, message) =>
			form.setFieldMeta(field, (prev) => ({ ...prev, errors: [message] })),
		onFieldError: () => requestAnimationFrame(() => focusFirstInvalid()),
	});

	useEffect(() => {
		form.setFieldValue("productId", product.id);
	}, [product.id, form]);

	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, !isPending);
	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: variantsListPath,
		allowNavigation,
		getIsDirty: () => form.state.isDirty,
	});

	return (
		<form
			ref={formRef}
			aria-label="Formulaire de création de variante"
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
					"CreateVariantForm",
				);
			}}
			onInvalidCapture={onInvalidCapture}
		>
			<input type="hidden" name="productId" value={product.id} />

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
					viewTransitionPrefix="variant-create"
				/>
			</fieldset>

			<form.AppForm>
				<AdminFormFooter pending={isPending}>
					<div className="flex justify-end">
						<form.SubmitButton
							isPending={isPending}
							idleLabel="Créer la variante"
							pendingLabel="Création…"
							showKbdHint
							className="w-full sm:w-auto sm:min-w-56"
						/>
					</div>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
