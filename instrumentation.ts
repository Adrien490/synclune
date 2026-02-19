import type { Instrumentation } from "next"

export function register() {
	const runtime =
		typeof (globalThis as Record<string, unknown>).EdgeRuntime === "string"
			? "edge"
			: "nodejs"
	console.log(
		`[instrumentation] Server started | runtime=${runtime} env=${process.env.NODE_ENV}`
	)
}

export const onRequestError: Instrumentation.onRequestError = (
	err,
	request,
	context
) => {
	const error = err instanceof Error ? err : new Error(String(err))
	const path = request.path || "unknown"
	const method = request.method || "unknown"
	const label = `${context.routeType}:${method} ${path}`

	const payload: Record<string, unknown> = {
		timestamp: new Date().toISOString(),
		error: {
			message: error.message,
			name: error.name,
			digest: "digest" in error ? (error as { digest: string }).digest : undefined,
			stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
		},
		request: {
			method,
			path,
		},
		context: {
			routerKind: context.routerKind,
			routePath: context.routePath,
			routeType: context.routeType,
			renderSource: "renderSource" in context ? context.renderSource : undefined,
			revalidateReason:
				"revalidateReason" in context ? context.revalidateReason : undefined,
			renderType: "renderType" in context ? context.renderType : undefined,
		},
	}

	console.error(`[onRequestError] ${label}`, JSON.stringify(payload))
}
