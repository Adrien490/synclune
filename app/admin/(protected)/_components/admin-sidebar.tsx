import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/shared/components/ui/sidebar";
import { Logo } from "@/shared/components/logo";
import { brandLinkLabel } from "@/shared/components/brand-link-label";
import type { AdminNavBadges } from "@/modules/orders/data/get-admin-nav-badges";
// GuardedLink : consulte le registre de NavigationGuardProvider avant de naviguer,
// pour ne pas perdre la saisie d'un formulaire admin dirty (cf. audit 2026-07-26).
import { GuardedLink as Link } from "@/shared/components/navigation/guarded-link";
import { Fragment } from "react/jsx-runtime";
import { CollapsibleNavGroup } from "./collapsible-nav-group";
import { NavMainClient } from "./nav-main-client";
import { navigationData } from "./navigation-config";
import { SidebarFooterUser } from "./sidebar-footer-user";

interface AdminSidebarProps {
	user?: {
		name: string;
		email: string;
		image?: string | null;
	};
	/** Compteurs de files actionnables (commandes/remboursements en attente). */
	badges?: AdminNavBadges;
}

export function AdminSidebar({ user, badges }: AdminSidebarProps) {
	return (
		// `collapsible="icon"` : ⌘B réduit à un rail d'icônes (3rem) au lieu de faire
		// disparaître toute la navigation. C'est ce que suppose tout le reste du code
		// (tooltips enrichis du compteur, pastille d'alerte, masquage du label logo,
		// espacement des séparateurs) — en `offcanvas` ces affordances étaient mortes.
		<Sidebar variant="floating" collapsible="icon" disableMobileSheet>
			<SidebarHeader>
				<SidebarMenu
					// iOS Safari + VO drop implicit list role when list-style:none
					role="list"
				>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							render={<Link href="/admin" />}
							tooltip={brandLinkLabel("/admin")}
							// Sans ce libellé, le nom accessible du bouton serait le seul texte
							// visible — « Synclune » — et ne dirait plus où il mène. Il CONTIENT
							// le texte visible, comme l'exige WCAG 2.5.3 (Label in Name).
							aria-label={brandLinkLabel("/admin")}
						>
							{/* `showText` : le wordmark vient de `LogoWordmark`, plus d'un <span>
							    recopié à côté. Il met aussi l'image en `alt=""` + `aria-hidden`,
							    ce qui règle un défaut au passage — le nom accessible du bouton
							    valait « Synclune — Créations artisanales faites main Synclune ». */}
							<Logo
								size={40}
								showText
								className="min-w-0 flex-1 gap-2"
								textClassName="flex-1 truncate text-2xl group-data-[collapsible=icon]:hidden"
							/>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{navigationData.navGroups.map((group, index) => {
					const groupId = `nav-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
					const isLastGroup = index === navigationData.navGroups.length - 1;

					return (
						<Fragment key={group.label}>
							{group.collapsible ? (
								<CollapsibleNavGroup groupLabel={group.label} groupId={groupId} badges={badges} />
							) : (
								<SidebarGroup role="group" aria-labelledby={groupId}>
									<SidebarGroupLabel
										id={groupId}
										className="text-xs font-semibold tracking-wider text-[color:var(--sidebar-muted-foreground)] uppercase"
									>
										{group.label}
									</SidebarGroupLabel>
									<SidebarMenu
										className="gap-1"
										// iOS Safari + VO drop implicit list role when list-style:none
										role="list"
									>
										{group.items.map((item) => {
											const Icon = item.icon;
											return (
												<SidebarMenuItem key={item.id}>
													<NavMainClient
														url={item.url}
														tooltip={item.title}
														badge={badges?.[item.id]}
														badgeUrl={item.badgeUrl}
													>
														<Icon className="size-5 shrink-0" aria-hidden="true" />
														<span className="flex-1">{item.title}</span>
													</NavMainClient>
												</SidebarMenuItem>
											);
										})}
									</SidebarMenu>
								</SidebarGroup>
							)}
							{!isLastGroup && (
								<SidebarSeparator className="my-2 group-data-[collapsible=icon]:my-3" />
							)}
						</Fragment>
					);
				})}
			</SidebarContent>
			{user && <SidebarFooterUser user={user} />}
		</Sidebar>
	);
}
