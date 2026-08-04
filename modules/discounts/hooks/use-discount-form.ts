"use client";

import { type DiscountType } from "@/app/generated/prisma/browser";
import { useAppForm } from "@/shared/components/forms";

/**
 * Valeurs internes du formulaire discount.
 *
 * `valueEuros` et `minOrderAmountEuros` sont saisis en **euros** (UX admin),
 * convertis en **centimes** côté server action avant validation du `createDiscountSchema`.
 *
 * Pour PERCENTAGE, `valueEuros` représente en réalité un entier 1–100 (le label
 * et le placeholder s'adaptent) — la conversion x100 n'est appliquée que pour FIXED_AMOUNT.
 */
export type DiscountFormValues = {
	code: string;
	type: DiscountType;
	valueEuros: number | null;
	minOrderAmountEuros: number | null;
	maxUsageCount: number | null;
	maxUsagePerUser: number | null;
	endsAt: string;
};

export interface DiscountFormSeed {
	code: string;
	type: DiscountType;
	value: number;
	minOrderAmount: number | null;
	maxUsageCount: number | null;
	maxUsagePerUser: number | null;
	endsAt: Date | null;
}

const formatDateTimeLocal = (date: Date | null): string =>
	date ? date.toISOString().slice(0, 16) : "";

/** Centimes DB → euros formulaire (uniquement pour FIXED_AMOUNT). */
const centsToEuros = (value: number, type: DiscountType): number =>
	type === "FIXED_AMOUNT" ? value / 100 : value;

export function getDiscountFormDefaults(seed?: DiscountFormSeed | null): DiscountFormValues {
	if (!seed) {
		return {
			code: "",
			type: "PERCENTAGE" as DiscountType,
			valueEuros: null,
			minOrderAmountEuros: null,
			maxUsageCount: null,
			maxUsagePerUser: null,
			endsAt: "",
		};
	}
	return {
		code: seed.code,
		type: seed.type,
		valueEuros: centsToEuros(seed.value, seed.type),
		minOrderAmountEuros: seed.minOrderAmount != null ? seed.minOrderAmount / 100 : null,
		maxUsageCount: seed.maxUsageCount,
		maxUsagePerUser: seed.maxUsagePerUser,
		endsAt: formatDateTimeLocal(seed.endsAt),
	};
}

/**
 * Hook partagé pour les 3 formulaires discount (create / update / dialog).
 * Centralise les defaultValues et permet d'exposer un type d'instance partagé.
 */
export function useDiscountForm(seed?: DiscountFormSeed | null) {
	const form = useAppForm({
		defaultValues: getDiscountFormDefaults(seed),
	});
	return { form };
}

export type DiscountFormInstance = ReturnType<typeof useDiscountForm>["form"];
