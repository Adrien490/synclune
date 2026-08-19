"use client";

import { useUpdateProductVariantForm } from "@/modules/variants/hooks/use-update-variant-form";
import type { VariantDetail } from "@/modules/variants/data/get-variant";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/shared/utils/toast";
import type { VariantFormInstance, VariantFormSharedProps } from "./variant-form-types";
import { VariantFormShell, VARIANT_SERVER_FIELD_NAMES } from "./variant-form-shell";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

interface EditProductVariantFormProps extends VariantFormSharedProps {
	variant: VariantDetail;
}

export function EditProductVariantForm({
	colors,
	materials,
	productSlug,
	variant,
}: EditProductVariantFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const variantsListPath = `/admin/catalogue/produits/${productSlug}/variantes`;

	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const { form, state, action, isPending } = useUpdateProductVariantForm({
		variant,
		onSuccess: (message, data) => {
			haptic("success");
			allowNavigationRef.current?.();
			const targetPath = data?.productSlug
				? `/admin/catalogue/produits/${data.productSlug}/variantes`
				: variantsListPath;
			toast.success(message || "Variante mise à jour avec succès");
			router.push(targetPath, PAGE_FADE_NAVIGATION);
		},
	});

	const serverErrors = useServerFieldErrors({
		state,
		fieldNames: VARIANT_SERVER_FIELD_NAMES,
		setFieldError: (field, message) =>
			form.setFieldMeta(field, (prev) => ({ ...prev, errors: [message] })),
		onFieldError: () => requestAnimationFrame(() => focusFirstInvalid()),
	});

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
			form={form as unknown as VariantFormInstance}
			action={action}
			isPending={isPending}
			serverErrors={serverErrors}
			ariaLabel="Formulaire d'édition de variante"
			hiddenFields={
				<>
					<input type="hidden" name="variantId" value={variant.id} />
					{/* Stock rendu à l'ouverture : permet à l'action de calculer un delta
					    relatif (au lieu d'un set absolu) et de ne pas écraser les ventes
					    concurrentes (décréments webhook) survenues pendant l'édition. */}
					<input type="hidden" name="originalStock" value={variant.stock} />
				</>
			}
			idleLabel="Mettre à jour la variante"
			pendingLabel="Mise à jour…"
			colors={colors}
			materials={materials}
			viewTransitionPrefix="variant-edit"
			formRef={formRef}
			focusFirstInvalid={focusFirstInvalid}
			onInvalidCapture={onInvalidCapture}
		/>
	);
}
