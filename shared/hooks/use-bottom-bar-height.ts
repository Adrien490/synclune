import { useEffect } from "react";

const CSS_VAR = "--bottom-bar-height";

/**
 * Sets a CSS custom property on :root to signal the height of a mobile bottom bar.
 * ScrollToTop reads this variable to position itself above any bottom bar.
 *
 * @param height - Height in pixels of the bottom bar
 * @param enabled - Whether the bar is currently visible (default: true)
 */
export function useBottomBarHeight(height: number, enabled = true) {
	useEffect(() => {
		if (!enabled) return;

		document.documentElement.style.setProperty(CSS_VAR, `${height}px`);

		return () => {
			document.documentElement.style.removeProperty(CSS_VAR);
		};
	}, [height, enabled]);
}
