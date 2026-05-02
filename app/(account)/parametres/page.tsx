import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { getUserProviders } from "@/modules/auth/data/get-user-providers";
import { ProfileForm } from "@/modules/users/components/profile-form";
import { SecuritySection } from "@/modules/users/components/security-section";
import { GdprSection } from "@/modules/users/components/gdpr-section";
import { LogoutCard } from "@/modules/auth/components/logout-card";
export const metadata: Metadata = {
	title: "Paramètres",
};

export default async function SettingsPage() {
	const user = await getCurrentUser();
	if (!user) notFound();

	const daysRemaining = computeDaysRemaining(user.deletionRequestedAt);

	return (
		<>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="space-y-6 lg:col-span-2">
					<section className="space-y-4" aria-labelledby="profile-heading">
						<h2 id="profile-heading" className="text-base font-semibold">
							Profil
						</h2>
						<div className="border-border/60 border-t pt-4">
							<ProfileForm user={user} />
						</div>
					</section>

					<Suspense fallback={<SecuritySkeleton />}>
						<SecuritySectionWrapper emailVerified={user.emailVerified} email={user.email} />
					</Suspense>

					<GdprSection accountStatus={user.accountStatus} daysRemaining={daysRemaining} />
				</div>

				<div className="space-y-6">
					<LogoutCard />
				</div>
			</div>
		</>
	);
}

async function SecuritySectionWrapper({
	emailVerified,
	email,
}: {
	emailVerified: boolean;
	email: string;
}) {
	const providers = await getUserProviders();
	return <SecuritySection emailVerified={emailVerified} providers={providers} email={email} />;
}

function SecuritySkeleton() {
	return (
		<SkeletonGroup label="Chargement des paramètres de sécurité">
			<section className="space-y-4">
				<Skeleton className="h-5 w-24" />
				<div className="border-border/60 space-y-6 border-t pt-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-9 w-24" />
					</div>
					<Skeleton className="h-4 w-32" />
				</div>
			</section>
		</SkeletonGroup>
	);
}

function computeDaysRemaining(deletionRequestedAt: Date | null): number {
	if (!deletionRequestedAt) return 0;
	const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
	const oneDayMs = 24 * 60 * 60 * 1000;
	return Math.max(
		0,
		Math.ceil((new Date(deletionRequestedAt).getTime() + thirtyDaysMs - Date.now()) / oneDayMs),
	);
}
