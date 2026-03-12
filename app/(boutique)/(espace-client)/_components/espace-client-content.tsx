import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/modules/auth/lib/auth";
import { AccountTabsNav } from "@/modules/users/components/account-tabs-nav";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { TriangleAlert } from "lucide-react";

export async function EspaceClientContent({ children }: { children: React.ReactNode }) {
	const reqHeaders = await headers();
	const session = await auth.api.getSession({
		headers: reqHeaders,
	});

	if (!session?.user) {
		redirect("/connexion?callbackURL=/commandes");
	}

	const user = await getCurrentUser();
	const isPendingDeletion = user?.accountStatus === "PENDING_DELETION";

	return (
		<div className="mx-auto max-w-6xl px-4 pt-20 pb-6 sm:px-6 sm:pt-28 lg:px-8 lg:pb-10">
			{isPendingDeletion && (
				<div
					role="status"
					className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
				>
					<TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
					<p>
						Votre compte est en cours de suppression. Vous pouvez annuler cette demande depuis vos{" "}
						<Link href="/parametres" className="font-medium underline">
							paramètres
						</Link>
						.
					</p>
				</div>
			)}
			<AccountTabsNav />
			<div>{children}</div>
		</div>
	);
}
