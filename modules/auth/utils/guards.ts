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

/**
 * Vérifie si l'utilisateur est connecté
 */
export async function isAuthenticated(): Promise<boolean> {
	try {
		const session = await getSession();
		return !!session?.user;
	} catch {
		return false;
	}
}
