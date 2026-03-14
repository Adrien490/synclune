import { getInstallPromptState } from "@/shared/data/get-install-prompt-state";
import { InstallPromptBanner } from "./install-prompt-banner";

/**
 * Async server wrapper that reads the install prompt cookie
 * and passes the state to the client banner component.
 * Avoids awaiting in the root layout on every request.
 */
export async function InstallPromptBannerAsync() {
	const state = await getInstallPromptState();
	return <InstallPromptBanner initialState={state} />;
}
