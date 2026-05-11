"use client";

import { revertToProcessing } from "@/modules/orders/actions/revert-to-processing";
import { useOrderAction } from "./use-order-action";

export function useRevertToProcessing() {
	return useOrderAction(revertToProcessing, {
		loadingMessage: "Retour en préparation…",
	});
}
