"use client";

import { useAppForm } from "@/shared/components/forms";
import type { ActionState } from "@/shared/types/server-action";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { CUSTOMIZATION_FORM_OPTIONS } from "../constants/customization-form-options";
import { sendCustomizationRequest } from "../actions/send-customization-request";

interface UseCustomizationFormOptions {
  onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de personnalisation
 * Utilise TanStack Form avec Next.js App Router
 */
export const useCustomizationForm = (options?: UseCustomizationFormOptions) => {
  const [state, action, isPending] = useActionState<
    ActionState | undefined,
    FormData
  >(
    withCallbacks(
      sendCustomizationRequest,
      createToastCallbacks({
        showSuccessToast: false,
        showErrorToast: false,
        onSuccess: (result) => {
          if (result.message) {
            options?.onSuccess?.(result.message);
          }
        },
      }),
    ),
    undefined,
  );

  const form = useAppForm({
    ...CUSTOMIZATION_FORM_OPTIONS,
    // Merge server state with form state for validation errors
    // Note: Le cast est nécessaire car TanStack Form attend FormState, pas ActionState
    transform: useTransform(
      (baseForm) =>
        mergeForm(baseForm, (state ?? {}) as Parameters<typeof mergeForm>[1]),
      [state],
    ),
  });

  return {
    form,
    state,
    action,
    isPending,
  };
};
