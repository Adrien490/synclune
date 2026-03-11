import { getSession } from "@/modules/auth/lib/get-current-session";
import { PostHogIdentify } from "./posthog-identify";

/**
 * Async server component that fetches the session
 * and passes user data to the client PostHogIdentify component.
 * Wrapped in <Suspense> in the root layout to avoid blocking render.
 */
export async function PostHogIdentifyAsync() {
	const session = await getSession();
	const user = session
		? { id: session.user.id, email: session.user.email, name: session.user.name }
		: null;

	return <PostHogIdentify user={user} />;
}
