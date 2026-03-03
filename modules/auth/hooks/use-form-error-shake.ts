"use client";

import { useState } from "react";

/**
 * Tracks error state changes and triggers a shake animation.
 *
 * Uses the React-recommended pattern for adjusting state during render
 * (setState during render, not in effects) to avoid cascading renders.
 * @see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */
export function useFormErrorShake(isError: boolean, errorKey: string | undefined) {
	const [shake, setShake] = useState(false);
	const [prevErrorKey, setPrevErrorKey] = useState<string | undefined>(undefined);

	// Adjust state during render when error key changes (React-recommended pattern)
	if (isError && errorKey !== prevErrorKey) {
		setPrevErrorKey(errorKey);
		setShake(true);
	} else if (!isError && prevErrorKey !== undefined) {
		setPrevErrorKey(undefined);
	}

	return {
		shake,
		onShakeComplete: () => setShake(false),
	};
}
