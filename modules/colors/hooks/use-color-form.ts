"use client";

import { useAppForm } from "@/shared/components/forms";

export interface ColorFormValues {
	name: string;
	hex: string;
	description: string;
	/** Statut actif/inactif — utilisé en édition (toggle). Création : toujours true. */
	isActive: boolean;
}

/**
 * Hook partagé entre create-color-form et edit-color-form.
 * Garantit que les deux instances exposent la même API typée pour
 * `<ColorFormFields form={form} />`.
 */
export function useColorForm(defaultValues: ColorFormValues) {
	return useAppForm({ defaultValues });
}

export type ColorFormInstance = ReturnType<typeof useColorForm>;
