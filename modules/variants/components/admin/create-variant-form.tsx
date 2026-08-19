"use client";

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
import type { CreateVariantFormProps } from "./variant-form-types";
import { VariantFormShell, VARIANT_SERVER_FIELD_NAMES } from "./variant-form-shell";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

export function CreateProductVariantForm({
	colors,
	materials,
	product,
	productSlug,
}: CreateVariantFormProps) {
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
			// Pas d'action sur le toast : la ligne suivante navigue déjà vers
			// `variantsListPath`, exactement la destination que proposait « Voir les
			// variantes ». Un bouton qui rejoue la navigation qu'on vient d'effectuer
			// est de la sur-notification.
			toast.success(message || "Variante créée avec succès");
			router.push(variantsListPath, PAGE_FADE_NAVIGATION);
		},
	});

	const serverErrors = useServerFieldErrors({
		state,
		fieldNames: VARIANT_SERVER_FIELD_NAMES,
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
		<VariantFormShell
			form={form}
			action={action}
			isPending={isPending}
			serverErrors={serverErrors}
			ariaLabel="Formulaire de création de variante"
			hiddenFields={<input type="hidden" name="productId" value={product.id} />}
			idleLabel="Créer la variante"
			pendingLabel="Création…"
			colors={colors}
			materials={materials}
			viewTransitionPrefix="variant-create"
			formRef={formRef}
			focusFirstInvalid={focusFirstInvalid}
			onInvalidCapture={onInvalidCapture}
		/>
	);
}
