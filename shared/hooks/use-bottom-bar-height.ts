import { useEffect, useRef } from "react";

const CSS_VAR = "--bottom-bar-height";

/** Registry of all currently active bottom-bar heights, keyed by unique symbol. */
const registry = new Map<symbol, number>();

/** Recompute and apply the CSS variable from all registered heights. */
function syncCssVar() {
	if (registry.size === 0) {
		document.documentElement.style.removeProperty(CSS_VAR);
		return;
	}

	let max = 0;
	for (const h of registry.values()) {
		if (h > max) max = h;
	}
	document.documentElement.style.setProperty(CSS_VAR, `${max}px`);
}

/**
 * Registers a bottom-bar height in a shared registry and sets
 * `--bottom-bar-height` on `:root` to the max of all registered heights.
 *
 * Safe for concurrent use: multiple bars can mount/unmount independently.
 *
 * @param height - Height in pixels of the bottom bar
 * @param enabled - Whether the bar is currently visible (default: true)
 */
export function useBottomBarHeight(height: number, enabled = true) {
	const keyRef = useRef<symbol | null>(null);

	if (keyRef.current === null) {
		keyRef.current = Symbol("bottom-bar");
	}

	useEffect(() => {
		const key = keyRef.current!;

		if (!enabled) {
			if (registry.has(key)) {
				registry.delete(key);
				syncCssVar();
			}
			return;
		}

		registry.set(key, height);
		syncCssVar();

		return () => {
			registry.delete(key);
			syncCssVar();
		};
	}, [height, enabled]);
}

// Exported for testing only
export { registry as _registry };
