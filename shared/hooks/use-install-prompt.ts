"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { setInstallPrompt } from "@/shared/actions/set-install-prompt";
import { INSTALL_PROMPT_MIN_VISITS } from "@/shared/constants/install-prompt";
import type { InstallPromptState } from "@/shared/data/get-install-prompt-state";

interface UseInstallPromptReturn {
	/** Whether the banner should be shown (server state + optimistic) */
	shouldShowBanner: boolean;
	/** Dismiss for this session (optimistic hide + server action) */
	dismiss: () => void;
	/** Mark as installed (permanent dismiss) */
	markInstalled: () => void;
	/** Record a visit */
	recordVisit: () => void;
	/** Whether any action is pending */
	isPending: boolean;
}

/**
 * Hook for managing PWA install prompt state via cookies.
 * Uses useOptimistic for instant UI feedback + server actions for persistence.
 */
export function useInstallPrompt(initialState: InstallPromptState): UseInstallPromptReturn {
	const [isTransitionPending, startTransition] = useTransition();

	// Local session state: once dismissed in this session, stays hidden
	const [dismissedThisSession, setDismissedThisSession] = useState(false);

	// Compute initial banner visibility from server state
	const initialBannerVisible =
		initialState.visitCount >= INSTALL_PROMPT_MIN_VISITS && !initialState.permanentlyDismissed;

	// Optimistic state for banner visibility
	const [optimisticVisible, setOptimisticVisible] = useOptimistic(initialBannerVisible);

	const [, formAction, isActionPending] = useActionState(setInstallPrompt, undefined);

	function dispatchAction(action: "dismiss" | "install" | "visit") {
		const formData = new FormData();
		formData.append("action", action);
		formAction(formData);
	}

	function dismiss() {
		setDismissedThisSession(true);
		startTransition(() => {
			setOptimisticVisible(false);
			dispatchAction("dismiss");
		});
	}

	function markInstalled() {
		setDismissedThisSession(true);
		startTransition(() => {
			setOptimisticVisible(false);
			dispatchAction("install");
		});
	}

	function recordVisit() {
		startTransition(() => {
			dispatchAction("visit");
		});
	}

	return {
		shouldShowBanner: optimisticVisible && !dismissedThisSession,
		dismiss,
		markInstalled,
		recordVisit,
		isPending: isTransitionPending || isActionPending,
	};
}
