import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { emailTailwindConfig } from "./email-tailwind-config";

interface RevertShippingNotificationEmailProps {
	orderNumber: string;
	customerName: string;
	reason: string;
	orderDetailsUrl: string;
}

export const RevertShippingNotificationEmail = ({
	orderNumber,
	customerName,
	reason,
	orderDetailsUrl,
}: RevertShippingNotificationEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>
				Mise à jour de l'expédition de votre commande {orderNumber}
			</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-background font-sans">
					<Container className="mx-auto my-8 max-w-[600px] rounded-lg border border-border bg-card px-8 py-10">
						{/* Header */}
						<Section className="mb-8 text-center">
							<Text className="m-0 text-2xl font-bold text-foreground">
								Expédition mise à jour
							</Text>
							<Text className="m-0 mt-2 text-sm text-muted-foreground">
								Commande {orderNumber}
							</Text>
						</Section>

						{/* Message principal */}
						<Section className="mb-8">
							<Text className="m-0 text-base text-foreground">
								Bonjour {customerName},
							</Text>
							<Text className="m-0 mt-4 text-base text-foreground">
								Nous vous informons d'un changement concernant l'expédition de votre commande{" "}
								<strong>{orderNumber}</strong>.
							</Text>
							<Text className="m-0 mt-4 text-base text-foreground">
								Le précédent numéro de suivi n'est plus valide. Votre commande est de nouveau
								en cours de préparation et vous recevrez un nouvel email avec les informations
								de suivi mises à jour dès que le colis sera réexpédié.
							</Text>
						</Section>

						{/* Raison */}
						<Section className="mb-8">
							<Text className="m-0 mb-3 text-lg font-semibold text-foreground">
								Motif du changement
							</Text>
							<div className="rounded-md bg-muted p-4">
								<Text className="m-0 text-sm text-foreground">
									{reason}
								</Text>
							</div>
						</Section>

						{/* Statut */}
						<Section className="mb-8 rounded-md border border-border bg-muted/50 p-4">
							<Text className="m-0 text-sm font-bold text-foreground">
								Nouveau statut
							</Text>
							<Text className="m-0 mt-2 text-sm text-muted-foreground">
								Votre commande est actuellement <strong>en préparation</strong>.
								Nous mettons tout en œuvre pour vous l'expédier dans les meilleurs délais.
							</Text>
						</Section>

						{/* Bouton */}
						<Section className="mb-8 text-center">
							<Button
								href={orderDetailsUrl}
								style={{ backgroundColor: "#D4A574" }}
								className="inline-block rounded-md px-8 py-4 text-base font-semibold text-white no-underline"
							>
								Suivre ma commande
							</Button>
						</Section>

						{/* Contact */}
						<Section className="mb-6 rounded-md border border-border bg-muted/30 p-4">
							<Text className="m-0 text-sm text-foreground">
								Une question ? Notre équipe est à votre disposition à{" "}
								<a
									href="mailto:contact@synclune.fr"
									className="text-primary underline"
								>
									contact@synclune.fr
								</a>
							</Text>
						</Section>

						{/* Footer */}
						<Section className="border-t pt-6" style={{ borderColor: "#E8E8E8" }}>
							<Text className="m-0 text-center text-xs text-muted-foreground">
								Nous vous prions de nous excuser pour ce désagrément.
								<br />
								L'équipe Synclune
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

RevertShippingNotificationEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	reason: "Erreur d'étiquetage du transporteur",
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as RevertShippingNotificationEmailProps;

export default RevertShippingNotificationEmail;
