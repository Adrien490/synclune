import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface NewsletterEmailProps {
	subject: string;
	content: string;
	unsubscribeUrl: string;
}

export const NewsletterEmail = ({
	subject,
	content,
	unsubscribeUrl,
}: NewsletterEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>{subject}</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "28px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
							Créations artisanales
						</Text>
					</Section>

					{/* Titre */}
					<Section style={{ marginBottom: "24px" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "20px",
								fontWeight: "600",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{subject}
						</Text>
					</Section>

					{/* Contenu */}
					<Section style={{ marginBottom: "32px" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "16px",
								lineHeight: "1.7",
								color: EMAIL_COLORS.text.primary,
								whiteSpace: "pre-line",
							}}
						>
							{content}
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button
							href="https://synclune.fr/produits"
							style={EMAIL_STYLES.button.primary}
						>
							Découvrir les créations
						</Button>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
						}}
					>
						<Text style={EMAIL_STYLES.text.small}>
							Vous recevez cet email car vous êtes inscrit à la newsletter.
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "16px", textAlign: "center" }}>
							<a
								href={unsubscribeUrl}
								style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}
							>
								Se désinscrire
							</a>
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "16px", textAlign: "center" }}>
							Synclune
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "8px", textAlign: "center" }}>
							© {new Date().getFullYear()} Synclune - Tous droits réservés
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

NewsletterEmail.PreviewProps = {
	subject: "Nouvelles créations disponibles",
	content:
		"Bonjour,\n\nJ'ai le plaisir de vous présenter mes dernières créations. Chaque pièce est faite à la main avec soin.\n\nN'hésitez pas à jeter un œil !",
	unsubscribeUrl: "https://synclune.fr/newsletter/unsubscribe",
} as NewsletterEmailProps;

export default NewsletterEmail;
