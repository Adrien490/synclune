import { getSession } from "@/modules/auth/lib/get-current-session";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { AdminWelcomeDialog } from "@/app/admin/_components/admin-welcome-dialog";

export async function AdminWelcomeDialogGate() {
	const session = await getSession();
	if (!session?.user.id || session.user.role !== "ADMIN") return null;

	const user = await prisma.user.findUnique({
		where: { id: session.user.id, ...notDeleted },
		select: { role: true, welcomeShownAt: true },
	});

	if (!user || user.role !== "ADMIN" || user.welcomeShownAt !== null) return null;

	return <AdminWelcomeDialog />;
}
