import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { getUserAccounts } from "@/modules/users/data/get-user-accounts";
import { AddressInfoCard } from "@/modules/users/components/address/address-info-card";
import { AddressInfoCardSkeleton } from "@/modules/users/components/address/address-info-card-skeleton";
import { getUserAddresses } from "@/modules/users/data/get-user-addresses";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import { RecentOrders } from "@/modules/orders/components/recent-orders";
import { RecentOrdersSkeleton } from "@/modules/orders/components/recent-orders-skeleton";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { KeyRound, LogOut, User } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Tableau de bord - Synclune | Espace personnel",
	description:
		"Accédez à votre espace personnel Synclune. Gérez vos commandes, vos informations et découvrez vos bijoux préférés.",
	keywords: [
		"tableau de bord",
		"mon compte",
		"espace client",
		"Synclune",
		"commandes",
		"profil utilisateur",
		"bijoux personnalisés",
	],
	robots: {
		index: false,
		follow: true,
	},
	alternates: {
		canonical: "/compte",
	},
	openGraph: {
		title: "Tableau de bord - Synclune | Espace personnel",
		description:
			"Votre espace personnel pour gérer vos commandes et préférences chez Synclune.",
		type: "website",
		url: "/compte",
	},
};

export default async function AccountPage() {
  // Créer les promises SANS les await
  const ordersPromise = getUserOrders({
    perPage: 10,
    sortBy: "created-descending",
    direction: "forward",
  });
  const userPromise = getCurrentUser();
  const addressesPromise = getUserAddresses();

  // Attendre uniquement les données nécessaires pour le rendu direct
  const [user, accounts] = await Promise.all([userPromise, getUserAccounts()]);

  // Vérifier si l'utilisateur a un compte email/password
  const hasPasswordAccount = accounts.some(
    (account) => account.providerId === "credential",
  );

  const breadcrumbs = [{ label: "Mon compte", href: "/account" }];

  return (
    <div className="min-h-screen relative">
      {/* Background minimal - Pages fonctionnelles */}
      <ParticleSystem variant="minimal" className="absolute inset-0 z-20" />

      {/* Header avec breadcrumbs */}
      <PageHeader
        title="Mon compte"
        description="Gérez vos commandes et vos informations personnelles"
        breadcrumbs={breadcrumbs}
      />

      {/* Contenu de la page */}
      <section className="bg-background py-8 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Commandes - 2/3 de la largeur sur desktop */}
            <div className="lg:col-span-2 space-y-6">
              <Suspense fallback={<RecentOrdersSkeleton />}>
                <RecentOrders ordersPromise={ordersPromise} />
              </Suspense>
            </div>

            {/* Profil et actions - 1/3 de la largeur sur desktop */}
            <div className="space-y-6">
              {/* Profil */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg/7 tracking-tight antialiased font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-base/6 tracking-normal antialiased font-medium truncate">
                      {user?.name || "Non défini"}
                    </p>
                    <p className="text-sm/6 tracking-normal antialiased text-muted-foreground truncate">
                      {user?.email || "Non défini"}
                    </p>
                  </div>
                  <div className="pt-2 space-y-2">
                    {hasPasswordAccount && (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <Link href="/compte/parametres">
                          <KeyRound className="mr-2 h-4 w-4" />
                          Changer mon mot de passe
                        </Link>
                      </Button>
                    )}
                    <LogoutButton className="w-full">
                      <Button variant="outline" className="w-full justify-start">
                        <LogOut className="mr-2 h-4 w-4" />
                        Se déconnecter
                      </Button>
                    </LogoutButton>
                  </div>
                </CardContent>
              </Card>

              {/* Adresses */}
              <Suspense fallback={<AddressInfoCardSkeleton />}>
                <AddressInfoCard addressesPromise={addressesPromise} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
