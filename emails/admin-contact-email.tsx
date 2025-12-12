import {
	Body,
	Container,
	Head,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface AdminContactEmailProps {
	senderName: string;
	senderEmail: string;
	message: string;
}

export const AdminContactEmail = ({
	senderName,
	senderEmail,
	message,
}: AdminContactEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>Message du dashboard de {senderName}</Preview>
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
							Nouveau message du dashboard
						</Text>
					</Section>

					{/* Expéditeur */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
							De
						</Text>
						<div style={EMAIL_STYLES.section.card}>
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: "600",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{senderName}
							</Text>
							<Link
								href={`mailto:${senderEmail}`}
								style={{
									...EMAIL_STYLES.link,
									display: "block",
									marginTop: "4px",
									fontSize: "14px",
								}}
							>
								{senderEmail}
							</Link>
						</div>
					</Section>

					{/* Message */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
							Message
						</Text>
						<div style={EMAIL_STYLES.section.card}>
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
									whiteSpace: "pre-wrap",
									wordWrap: "break-word",
								}}
							>
								{message}
							</Text>
						</div>
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
							Ce message a été envoyé depuis le dashboard Synclune Bijoux
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "8px" }}>
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

AdminContactEmail.PreviewProps = {
	senderName: "Administrateur",
	senderEmail: "admin@synclune.fr",
	message:
		"Bonjour Adrien,\n\nJe voulais te signaler un problème sur le site.\n\nMerci !",
} as AdminContactEmailProps;

export default AdminContactEmail;
