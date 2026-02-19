performance.mark("app-init")

try {
	window.addEventListener("error", (event) => {
		console.error(
			"[Instrumentation] Uncaught error:",
			event.error ?? event.message
		)
	})

	window.addEventListener("unhandledrejection", (event) => {
		console.error("[Instrumentation] Unhandled rejection:", event.reason)
	})
} catch {
	// Silently ignore if addEventListener is unavailable
}

export function onRouterTransitionStart(
	url: string,
	navigationType: "push" | "replace" | "traverse"
) {
	performance.mark(`nav-${navigationType}-${url}`)
}
