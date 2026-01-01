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

interface NewsletterWelcomeEmailProps {
	email: string;
	unsubscribeUrl: string;
}

export const NewsletterWelcomeEmail = ({
	email,
	unsubscribeUrl,
}: NewsletterWelcomeEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>Bienvenue</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "24px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
					</Section>

					{/* Titre */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={EMAIL_STYLES.heading.h2}>Bienvenue</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Tu es inscrit à la newsletter avec {email}.
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button
							href="https://synclune.fr/produits"
							style={EMAIL_STYLES.button.primary}
						>
							Voir les créations
						</Button>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.tiny}>
							<a
								href={unsubscribeUrl}
								style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}
							>
								Se désinscrire
							</a>
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "12px" }}>
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

NewsletterWelcomeEmail.PreviewProps = {
	email: "example@email.com",
	unsubscribeUrl: "https://synclune.fr/newsletter/unsubscribe?token=abc123",
} as NewsletterWelcomeEmailProps;

export default NewsletterWelcomeEmail;
