"use client";

import { duplicateProductType } from "@/modules/product-types/actions/duplicate-product-type";
import { useActionStateWithToast } from "@/shared/hooks/use-action-state-with-toast";

export interface DuplicateProductTypeSuccessData {
	id: string;
	label: string;
	slug: string;
}

const isDuplicateProductTypeSuccessData = (
	value: unknown,
): value is DuplicateProductTypeSuccessData => {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as DuplicateProductTypeSuccessData).id === "string" &&
		typeof (value as DuplicateProductTypeSuccessData).label === "string" &&
		typeof (value as DuplicateProductTypeSuccessData).slug === "string"
	);
};

interface UseDuplicateProductTypeOptions {
	onSuccess?: (message: string, data: DuplicateProductTypeSuccessData) => void;
}

export const useDuplicateProductType = (options?: UseDuplicateProductTypeOptions) => {
	const { state, action, isPending } = useActionStateWithToast<DuplicateProductTypeSuccessData>(
		duplicateProductType,
		{
			loadingMessage: "Duplication du type…",
			showSuccessToast: false,
			extractData: (result) =>
				isDuplicateProductTypeSuccessData(result.data) ? result.data : null,
			onSuccess: (message, data) => {
				if (data) options?.onSuccess?.(message, data);
			},
		},
	);

	const runDuplicate = (productTypeId: string) => {
		const formData = new FormData();
		formData.append("productTypeId", productTypeId);
		action(formData);
	};

	return {
		state,
		action,
		isPending,
		duplicateProductType: runDuplicate,
	};
};
