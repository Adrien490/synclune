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

interface PasswordChangedEmailProps {
	userName: string;
	changeDate: string;
	resetUrl: string;
}

export const PasswordChangedEmail = ({
	userName,
	changeDate,
	resetUrl,
}: PasswordChangedEmailProps) => (
	<Html>
		<Head />
		<Preview>Mot de passe modifié</Preview>
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
					<Text style={EMAIL_STYLES.heading.h2}>Mot de passe modifié</Text>
					<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
						Bonjour {userName}, ton mot de passe a été modifié le {changeDate}.
					</Text>
				</Section>

				{/* Avertissement */}
				<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}>
					<Text
						style={{
							...EMAIL_STYLES.text.body,
							margin: 0,
							fontWeight: "600",
						}}
					>
						Ce n'était pas toi ?
					</Text>
					<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
						Réinitialise ton mot de passe immédiatement.
					</Text>
				</Section>

				{/* CTA */}
				<Section style={{ marginBottom: "32px", textAlign: "center" }}>
					<Button href={resetUrl} style={EMAIL_STYLES.button.primary}>
						Réinitialiser
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
						© {new Date().getFullYear()} Synclune
					</Text>
				</Section>
			</Container>
		</Body>
	</Html>
);

PasswordChangedEmail.PreviewProps = {
	userName: "Marie",
	changeDate: "15 janvier 2025 à 14:30",
	resetUrl: "https://synclune.fr/mot-de-passe-oublie",
} as PasswordChangedEmailProps;

export default PasswordChangedEmail;
