performance.mark("app-init");

window.addEventListener("error", (event) => {
	console.error("[CLIENT_ERROR]", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
	console.error("[UNHANDLED_REJECTION]", event.reason);
});

export function onRouterTransitionStart(
	url: string,
	navigationType: "push" | "replace" | "traverse",
) {
	performance.mark(`nav-${navigationType}-${url}`);
}
