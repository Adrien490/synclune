"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshNewsletter } from "@/modules/newsletter/actions/refresh-newsletter";

interface UseRefreshNewsletterOptions {
	onSuccess?: () => void;
}

export function useRefreshNewsletter(options?: UseRefreshNewsletterOptions) {
	return useRefreshAction(refreshNewsletter, {
		onSuccess: options?.onSuccess,
	});
}
