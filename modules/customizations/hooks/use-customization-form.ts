"use client";

import { useAppForm } from "@/shared/components/forms";
import type { ActionState } from "@/shared/types/server-action";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState, useEffect, useRef } from "react";
import {
	type CUSTOMIZATION_DEFAULT_VALUES,
	CUSTOMIZATION_FORM_OPTIONS,
} from "../constants/customization-form-options";
import { sendCustomizationRequest } from "../actions/send-customization-request";
import { customizationDraftSchema } from "../schemas/customization.schema";

const DRAFT_STORAGE_KEY = "synclune-customization-draft";

interface UseCustomizationFormOptions {
	userInfo?: { firstName: string; email: string };
	onSuccess?: (message: string) => void;
}

function loadDraft(): Partial<typeof CUSTOMIZATION_DEFAULT_VALUES> | null {
	try {
		const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
		if (!saved) return null;
		const parsed: unknown = JSON.parse(saved);
		const result = customizationDraftSchema.safeParse(parsed);
		if (!result.success) {
			localStorage.removeItem(DRAFT_STORAGE_KEY);
			return null;
		}
		return result.data;
	} catch {
		return null;
	}
}

function saveDraft(values: typeof CUSTOMIZATION_DEFAULT_VALUES) {
	try {
		// Don't save consent, honeypot, or ephemeral upload state
		const { rgpdConsent: _, website: __, inspirationMedias: ___, ...toSave } = values;
		const hasContent = toSave.firstName || toSave.email || toSave.details || toSave.phone;
		if (!hasContent) {
			localStorage.removeItem(DRAFT_STORAGE_KEY);
			return;
		}
		localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toSave));
	} catch {
		// Silently fail if localStorage is full or unavailable
	}
}

function clearDraft() {
	try {
		localStorage.removeItem(DRAFT_STORAGE_KEY);
	} catch {
		// Silently fail
	}
}

/**
 * Hook pour le formulaire de personnalisation
 * Utilise TanStack Form avec Next.js App Router
 * Persiste un brouillon en localStorage
 */
export const useCustomizationForm = (options?: UseCustomizationFormOptions) => {
	const draftRestored = useRef(false);

	const [state, action, isPending] = useActionState<ActionState | undefined, FormData>(
		withCallbacks(
			sendCustomizationRequest,
			createToastCallbacks({
				showSuccessToast: false,
				showErrorToast: false,
				onSuccess: (result) => {
					clearDraft();
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
		// Note: Le cast est necessaire car TanStack Form attend FormState, pas ActionState
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state ?? {}) as Parameters<typeof mergeForm>[1]),
			[state],
		),
	});

	// Restore draft from localStorage on mount, with session user info as fallback
	useEffect(() => {
		if (draftRestored.current) return;
		draftRestored.current = true;

		const draft = loadDraft();

		// Draft takes priority, then session user info as fallback
		if (draft?.firstName || options?.userInfo?.firstName) {
			form.setFieldValue("firstName", draft?.firstName ?? options?.userInfo?.firstName ?? "");
		}
		if (draft?.email || options?.userInfo?.email) {
			form.setFieldValue("email", draft?.email ?? options?.userInfo?.email ?? "");
		}
		if (draft?.phone) form.setFieldValue("phone", draft.phone);
		if (draft?.details) form.setFieldValue("details", draft.details);
		if (draft?.productTypeLabel) form.setFieldValue("productTypeLabel", draft.productTypeLabel);
	}, [form, options?.userInfo]);

	// Save draft to localStorage on form value changes
	useEffect(() => {
		const subscription = form.store.subscribe(() => {
			const values = form.state.values;
			saveDraft(values);
		});
		return () => subscription.unsubscribe();
	}, [form]);

	return {
		form,
		state,
		action,
		isPending,
	};
};
