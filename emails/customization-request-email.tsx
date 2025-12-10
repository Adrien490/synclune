import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { emailTailwindConfig } from "./email-tailwind-config";

interface CustomizationRequestEmailProps {
	firstName: string;
	lastName: string;
	email: string;
	phone?: string;
	jewelryType: string;
	customizationDetails: string;
}

export const CustomizationRequestEmail = ({
	firstName,
	lastName,
	email,
	phone,
	jewelryType,
	customizationDetails,
}: CustomizationRequestEmailProps) => {
	const fullName = `${firstName} ${lastName}`;

	return (
		<Html>
			<Head />
			<Preview>Nouvelle demande de personnalisation de {fullName}</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-background font-sans">
					<Container className="mx-auto my-8 max-w-[600px] rounded-lg border border-border bg-card px-8 py-10">
						{/* Header */}
						<Section className="mb-8 text-center">
							<Text className="m-0 text-2xl font-bold" style={{ color: "#D4A574" }}>
								Nouvelle Demande de Personnalisation
							</Text>
							<Text className="m-0 mt-2 text-sm text-muted-foreground">
								Synclune - Admin
							</Text>
						</Section>

						{/* Message d'alerte */}
						<Section className="mb-6">
							<div className="rounded-md border-l-4 border-secondary bg-secondary/10 p-4">
								<Text className="m-0 text-sm font-semibold text-foreground">
									Action requise
								</Text>
								<Text className="m-0 mt-1 text-sm text-muted-foreground">
									Un client souhaite une commande personnalisée. Répondez
									rapidement !
								</Text>
							</div>
						</Section>

						{/* Informations client */}
						<Section className="mb-6">
							<Text className="m-0 mb-4 text-xl font-semibold text-foreground">
								Informations du client
							</Text>
							<div className="rounded-md bg-muted p-4">
								<table style={{ width: "100%", borderCollapse: "collapse" }}>
									<tbody>
										<tr>
											<td
												style={{
													padding: "8px 0",
													color: "#858585",
													fontSize: "14px",
													width: "140px",
												}}
											>
												<strong>Nom complet :</strong>
											</td>
											<td style={{ padding: "8px 0", fontSize: "14px" }}>
												{fullName}
											</td>
										</tr>
										<tr>
											<td
												style={{
													padding: "8px 0",
													color: "#858585",
													fontSize: "14px",
												}}
											>
												<strong>Email :</strong>
											</td>
											<td style={{ padding: "8px 0", fontSize: "14px" }}>
												<Link
													href={`mailto:${email}`}
													style={{ color: "#C73767" }} className=" no-underline"
												>
													{email}
												</Link>
											</td>
										</tr>
										{phone && (
											<tr>
												<td
													style={{
														padding: "8px 0",
														color: "#858585",
														fontSize: "14px",
													}}
												>
													<strong>Téléphone :</strong>
												</td>
												<td style={{ padding: "8px 0", fontSize: "14px" }}>
													<Link
														href={`tel:${phone}`}
														style={{ color: "#C73767" }} className=" no-underline"
													>
														{phone}
													</Link>
												</td>
											</tr>
										)}
										<tr>
											<td
												style={{
													padding: "8px 0",
													color: "#858585",
													fontSize: "14px",
												}}
											>
												<strong>Type de bijou :</strong>
											</td>
											<td style={{ padding: "8px 0", fontSize: "14px" }}>
												{jewelryType}
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</Section>

						{/* Détails de la personnalisation */}
						<Section className="mb-6">
							<Text className="m-0 mb-4 text-xl font-semibold text-foreground">
								Détails du projet
							</Text>
							<div className="rounded-md border border-secondary/20 bg-secondary/5 p-4">
								<Text className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
									{customizationDetails}
								</Text>
							</div>
						</Section>


						{/* CTA */}
						<Section className="mb-6 text-center">
							<Text className="m-0 mb-4 text-base text-foreground">
								Répondez rapidement pour ne pas perdre un client potentiel.
							</Text>
							<Button
								href={`mailto:${email}?subject=RE: Demande de personnalisation - Synclune`}
								style={{ backgroundColor: "#C73767" }} className="inline-block rounded-md px-8 py-4 text-base font-semibold text-white no-underline"
							>
								Répondre au client
							</Button>
						</Section>

						{/* Footer */}
						<Section className="border-t pt-6" style={{ borderColor: "#E8E8E8" }}>
							<Text className="m-0 text-center text-sm text-muted-foreground">
								Notification automatique - Synclune
							</Text>
							<Text className="m-0 mt-2 text-center text-xs text-muted-foreground">
								© {new Date().getFullYear()} Synclune - Tous droits réservés
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

CustomizationRequestEmail.PreviewProps = {
	firstName: "Marie",
	lastName: "Dupont",
	email: "marie.dupont@example.com",
	phone: "+33612345678",
	jewelryType: "Collier",
	customizationDetails:
		"Bonjour,\n\nJe souhaiterais un collier personnalisé avec les initiales de ma fille gravées sur un pendentif rond en argent. Les initiales seraient 'ML' en écriture cursive. J'aimerais que le pendentif fasse environ 2cm de diamètre.\n\nPouvez-vous me faire un devis et m'indiquer les délais de réalisation ?\n\nMerci d'avance !",
} as CustomizationRequestEmailProps;

export default CustomizationRequestEmail;
