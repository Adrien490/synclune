import Link from "next/link";
import { unauthorized } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/modules/auth/lib/auth";
import { AcceptTermsBanner } from "@/modules/users/components/accept-terms-banner";
import { AccountTabsNav } from "@/modules/users/components/account-tabs-nav";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { TriangleAlert } from "lucide-react";

export async function EspaceClientContent({ children }: { children: React.ReactNode }) {
	let session;
	try {
		const reqHeaders = await headers();
		session = await auth.api.getSession({
			headers: reqHeaders,
		});
	} catch {
		unauthorized();
	}

	if (!session?.user) {
		unauthorized();
	}

	let user;
	try {
		user = await getCurrentUser();
	} catch {
		user = null;
	}
	const isPendingDeletion = user?.accountStatus === "PENDING_DELETION";
	// RGPD-AUDIT P1-3 : comptes OAuth (Google) sans acceptation CGV tracée —
	// le flux email/password pose termsAcceptedAt, pas le flux OAuth.
	const needsTermsAcceptance = user !== null && user.termsAcceptedAt === null;

	return (
		<div className="mx-auto max-w-6xl px-4 pt-20 pb-6 sm:px-6 sm:pt-28 lg:px-8 lg:pb-10">
			{isPendingDeletion && (
				<div
					role="status"
					className="border-warning/30 bg-warning/10 text-warning mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
				>
					<TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
					<p>
						Votre compte est en cours de suppression. Vous pouvez annuler cette demande depuis vos{" "}
						<Link href="/parametres#donnees-personnelles" className="font-medium underline">
							paramètres
						</Link>
						.
					</p>
				</div>
			)}
			{needsTermsAcceptance && (
				<div className="mb-6">
					<AcceptTermsBanner />
				</div>
			)}
			<AccountTabsNav />
			<div>{children}</div>
		</div>
	);
}
