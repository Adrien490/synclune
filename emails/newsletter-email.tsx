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
						<Text style={EMAIL_STYLES.heading.h2}>{subject}</Text>
					</Section>

					{/* Contenu */}
					<Section style={{ marginBottom: "24px" }}>
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

NewsletterEmail.PreviewProps = {
	subject: "Nouvelles créations",
	content:
		"Bonjour,\n\nJ'ai le plaisir de vous présenter mes dernières créations.",
	unsubscribeUrl: "https://synclune.fr/newsletter/unsubscribe",
} as NewsletterEmailProps;

export default NewsletterEmail;
