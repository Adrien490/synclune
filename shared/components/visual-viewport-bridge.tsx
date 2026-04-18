"use client";

import { useVisualViewport } from "@/shared/hooks/use-visual-viewport";

/**
 * Pure side-effect mount for `useVisualViewport`.
 *
 * Mount once at the root of a client surface (admin layout) so the hook
 * installs its listener on `window.visualViewport` and maintains the
 * `--vvh` CSS var + `[data-keyboard]` attribute on `<html>`. Renders nothing.
 */
export function VisualViewportBridge() {
	useVisualViewport();
	return null;
}
