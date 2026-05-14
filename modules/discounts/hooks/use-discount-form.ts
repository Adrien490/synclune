"use client";

import { type DiscountType } from "@/app/generated/prisma/browser";
import { useAppForm } from "@/shared/components/forms";

export type DiscountFormValues = {
	code: string;
	type: DiscountType;
	value: number | null;
	minOrderAmount: number | null;
	maxUsageCount: number | null;
	maxUsagePerUser: number | null;
	startsAt: string;
	endsAt: string;
};

export interface DiscountFormSeed {
	code: string;
	type: DiscountType;
	value: number;
	minOrderAmount: number | null;
	maxUsageCount: number | null;
	maxUsagePerUser: number | null;
	startsAt: Date | null;
	endsAt: Date | null;
}

const formatDateTimeLocal = (date: Date | null): string =>
	date ? date.toISOString().slice(0, 16) : "";

export function getDiscountFormDefaults(seed?: DiscountFormSeed | null): DiscountFormValues {
	if (!seed) {
		return {
			code: "",
			type: "PERCENTAGE" as DiscountType,
			value: null,
			minOrderAmount: null,
			maxUsageCount: null,
			maxUsagePerUser: null,
			startsAt: "",
			endsAt: "",
		};
	}
	return {
		code: seed.code,
		type: seed.type,
		value: seed.value,
		minOrderAmount: seed.minOrderAmount,
		maxUsageCount: seed.maxUsageCount,
		maxUsagePerUser: seed.maxUsagePerUser,
		startsAt: formatDateTimeLocal(seed.startsAt),
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
