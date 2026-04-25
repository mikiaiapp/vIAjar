import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = os.getenv("SMTP_SERVER", "172.17.0.1") # Gateway por defecto para llegar al NAS host
SMTP_PORT = int(os.getenv("SMTP_PORT", "25"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "vIAjar@synology.me")

def send_email(subject: str, recipient: str, body_html: str):
    msg = MIMEMultipart()
    msg['From'] = SMTP_FROM
    msg['To'] = recipient
    msg['Subject'] = subject

    msg.attach(MIMEText(body_html, 'html'))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Error enviando email: {e}")
        return False

def send_welcome_email(recipient_name: str, recipient_email: str):
    subject = "¡Bienvenido a vIAjar! 🌍"
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h1 style="color: #5c6bc0;">Hola, {recipient_name}!</h1>
                <p>Gracias por registrarte en <b>vIAjar</b>, tu diseñador de guías de viajes por IA.</p>
                <p>Ya puedes empezar a planificar tus rutas y generar guías premium tipo revista.</p>
                <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                    <p style="margin: 0;"><b>Próximos pasos:</b></p>
                    <ul>
                        <li>Configura tus API Keys (Gemini/Groq) en tu perfil.</li>
                        <li>Crea tu primer itinerario inteligente.</li>
                        <li>Exporta tu guía en PDF.</li>
                    </ul>
                </div>
                <p style="margin-top: 30px; font-size: 0.8em; color: #777;">Este es un mensaje automático de tu Synology NAS.</p>
            </div>
        </body>
    </html>
    """
    return send_email(subject, recipient_email, html)
