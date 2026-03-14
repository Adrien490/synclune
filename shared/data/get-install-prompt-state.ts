import "server-only";

import { cookies } from "next/headers";
import { INSTALL_PROMPT_COOKIE_NAME } from "@/shared/constants/install-prompt";
import { installPromptCookieSchema } from "@/shared/schemas/install-prompt.schema";

export interface InstallPromptState {
	visitCount: number;
	dismissCount: number;
	permanentlyDismissed: boolean;
}

const DEFAULT_STATE: InstallPromptState = {
	visitCount: 0,
	dismissCount: 0,
	permanentlyDismissed: false,
};

/**
 * Read install prompt state from cookie.
 * Returns defaults if cookie is absent or malformed.
 */
export async function getInstallPromptState(): Promise<InstallPromptState> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(INSTALL_PROMPT_COOKIE_NAME);

	if (!cookie?.value) return DEFAULT_STATE;

	try {
		const parsed = installPromptCookieSchema.safeParse(JSON.parse(cookie.value));
		if (!parsed.success) return DEFAULT_STATE;

		return {
			visitCount: parsed.data.v,
			dismissCount: parsed.data.d,
			permanentlyDismissed: parsed.data.p,
		};
	} catch {
		return DEFAULT_STATE;
	}
}
