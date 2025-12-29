import { getSession } from "@/modules/auth/lib/get-current-session";

/**
 * Vérifie si l'utilisateur actuel est admin
 */
export async function isAdmin(): Promise<boolean> {
	try {
		const session = await getSession();
		return session?.user?.role === "ADMIN";
	} catch {
		return false;
	}
}
