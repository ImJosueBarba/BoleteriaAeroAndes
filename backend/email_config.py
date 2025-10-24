import os
from pathlib import Path
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import EmailStr
from typing import List
from dotenv import load_dotenv

load_dotenv()

# Configuración de email
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "").replace(" ", "")  # Eliminar espacios
MAIL_FROM = os.getenv("MAIL_FROM", "noreply@boleteriajb.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")

def _send_email(to_email: str, subject: str, html_content: str):
    """Función interna para enviar emails usando smtplib"""
    try:
        print(f"\n{'='*60}")
        print(f"📧 INICIANDO ENVÍO DE EMAIL")
        print(f"{'='*60}")
        print(f"Destino: {to_email}")
        print(f"Asunto: {subject}")
        print(f"Servidor: {MAIL_SERVER}:{MAIL_PORT}")
        print(f"Usuario: {MAIL_USERNAME}")
        print(f"{'='*60}\n")
        
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = MAIL_FROM
        message["To"] = to_email
        
        # Texto plano alternativo
        text = "Por favor, visualiza este email en un cliente que soporte HTML."
        
        # Adjuntar partes
        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html_content, "html")
        message.attach(part1)
        message.attach(part2)
        
        print("🔌 Conectando al servidor SMTP...")
        server = smtplib.SMTP(MAIL_SERVER, MAIL_PORT)
        
        print("🔒 Iniciando TLS...")
        server.starttls()
        
        print("🔑 Autenticando...")
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        
        print("📨 Enviando mensaje...")
        server.sendmail(MAIL_FROM, to_email, message.as_string())
        
        print("✅ Email enviado exitosamente!")
        server.quit()
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"\n{'='*60}")
        print(f"❌ ERROR AL ENVIAR EMAIL")
        print(f"{'='*60}")
        print(f"Tipo de error: {type(e).__name__}")
        print(f"Mensaje: {str(e)}")
        print(f"{'='*60}\n")
        raise e

def send_verification_email(email: EmailStr, token: str, nombre: str):
    """Enviar email de verificación"""
    
    print(f"\n🔔 Preparando email de VERIFICACIÓN para {email}")
    
    # URL de verificación
    verification_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/verificar-email?token={token}"
    
    print(f"🔗 URL de verificación: {verification_url}")
    
    # HTML moderno y atractivo pero compatible
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8fafc; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <!-- Main Container -->
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                        
                        <!-- Modern Header with Plane Icon -->
                        <tr>
                            <td style="background: #2563eb; padding: 48px 40px; text-align: center;">
                                <div style="font-size: 56px; margin-bottom: 16px;">✈️</div>
                                <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: -0.5px;">Boletería JB</h1>
                                <p style="margin: 12px 0 0 0; color: #bfdbfe; font-size: 15px; font-weight: 500;">Tu próxima aventura comienza aquí</p>
                            </td>
                        </tr>
                        
                        <!-- Content Section -->
                        <tr>
                            <td style="padding: 48px 40px;">
                                
                                <!-- Welcome Badge -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                                    <tr>
                                        <td align="center">
                                            <div style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                                                👋 BIENVENIDO
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                
                                <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 28px; font-weight: 700; text-align: center;">
                                    ¡Hola, {nombre}!
                                </h2>
                                
                                <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.7; text-align: center;">
                                    Estamos emocionados de que te unas a <strong style="color: #2563eb;">Boletería JB</strong>.<br>
                                    Solo falta un paso para comenzar a explorar los mejores vuelos.
                                </p>
                                
                                <!-- Card with verification message -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                                    <tr>
                                        <td style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                                            <p style="margin: 0; color: #1e293b; font-size: 15px; line-height: 1.6; text-align: center;">
                                                🔐 Para activar tu cuenta y garantizar la seguridad,<br>
                                                necesitamos verificar tu dirección de correo electrónico.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Modern CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td align="center" style="padding: 32px 0;">
                                            <a href="{verification_url}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 18px 56px; border-radius: 12px; font-weight: 700; font-size: 17px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);">
                                                ✓ Verificar mi Cuenta
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 24px 0; color: #64748b; font-size: 14px; text-align: center; line-height: 1.6;">
                                    ¿El botón no funciona? Copia y pega este enlace en tu navegador:
                                </p>
                                
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center;">
                                            <a href="{verification_url}" style="color: #2563eb; font-size: 13px; word-break: break-all; text-decoration: none;">
                                                {verification_url}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Warning Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px;">
                                    <tr>
                                        <td style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
                                            <table cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 12px; vertical-align: top;">
                                                        <div style="font-size: 24px;">⏱️</div>
                                                    </td>
                                                    <td>
                                                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                                                            <strong>Este enlace es temporal</strong><br>
                                                            Por tu seguridad, expirará en 24 horas.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Benefits Section -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 40px;">
                                    <tr>
                                        <td>
                                            <p style="margin: 0 0 20px 0; color: #0f172a; font-size: 16px; font-weight: 600; text-align: center;">
                                                ¿Qué puedes hacer con tu cuenta?
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td width="50%" style="padding: 12px; vertical-align: top;">
                                                        <div style="text-align: center;">
                                                            <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
                                                            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                                                                <strong style="color: #1e293b;">Buscar vuelos</strong><br>
                                                                Encuentra las mejores opciones
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td width="50%" style="padding: 12px; vertical-align: top;">
                                                        <div style="text-align: center;">
                                                            <div style="font-size: 32px; margin-bottom: 8px;">🎫</div>
                                                            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                                                                <strong style="color: #1e293b;">Reservar boletos</strong><br>
                                                                Proceso rápido y seguro
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td width="50%" style="padding: 12px; vertical-align: top;">
                                                        <div style="text-align: center;">
                                                            <div style="font-size: 32px; margin-bottom: 8px;">📱</div>
                                                            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                                                                <strong style="color: #1e293b;">Gestionar reservas</strong><br>
                                                                Control total de tus vuelos
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td width="50%" style="padding: 12px; vertical-align: top;">
                                                        <div style="text-align: center;">
                                                            <div style="font-size: 32px; margin-bottom: 8px;">💳</div>
                                                            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                                                                <strong style="color: #1e293b;">Pagos seguros</strong><br>
                                                                Múltiples opciones disponibles
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 32px 0 0 0; color: #94a3b8; font-size: 13px; line-height: 1.6; text-align: center;">
                                    Si no creaste una cuenta en Boletería JB,<br>
                                    simplemente ignora este correo.
                                </p>
                                
                            </td>
                        </tr>
                        
                        <!-- Modern Footer -->
                        <tr>
                            <td style="background: #0f172a; padding: 32px 40px; text-align: center;">
                                <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 14px; font-weight: 500;">
                                    Boletería JB
                                </p>
                                <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px;">
                                    Sistema de Reservación de Vuelos
                                </p>
                                <div style="border-top: 1px solid #334155; padding-top: 16px; margin-top: 16px;">
                                    <p style="margin: 0; color: #64748b; font-size: 12px;">
                                        © 2025 Boletería JB. Todos los derechos reservados.
                                    </p>
                                    <p style="margin: 8px 0 0 0; color: #475569; font-size: 11px;">
                                        Este es un correo automático, por favor no responder directamente.
                                    </p>
                                </div>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    try:
        _send_email(email, "Verificacion de Email - Boleteria JB", html_content)
        print(f"✅ Email de verificación enviado exitosamente a {email}\n")
    except Exception as e:
        print(f"❌ Error enviando email de verificación a {email}: {str(e)}\n")
        raise e

def send_welcome_email(email: EmailStr, nombre: str):
    """Enviar email de bienvenida después de verificación"""
    
    print(f"\n🎉 Preparando email de BIENVENIDA para {email}")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f8fafc; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <!-- Main Container -->
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                        
                        <!-- Modern Header with Plane Icon -->
                        <tr>
                            <td style="background: #10b981; padding: 48px 40px; text-align: center;">
                                <div style="font-size: 56px; margin-bottom: 16px;">✈️</div>
                                <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: -0.5px;">Cuenta Verificada</h1>
                                <p style="margin: 12px 0 0 0; color: #d1fae5; font-size: 15px; font-weight: 500;">Ya eres parte de Boleteria JB</p>
                            </td>
                        </tr>
                        
                        <!-- Success Icon -->
                        <tr>
                            <td style="padding: 40px 40px 0 40px; text-align: center;">
                                <div style="font-size: 72px; margin-bottom: 20px;">✅</div>
                            </td>
                        </tr>
                        
                        <!-- Content Section -->
                        <tr>
                            <td style="padding: 0 40px 48px 40px;">
                                
                                <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 28px; font-weight: 700; text-align: center;">
                                    Bienvenido, {nombre}!
                                </h2>
                                
                                <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px; line-height: 1.7; text-align: center;">
                                    Tu correo electronico ha sido verificado exitosamente.<br>
                                    Ya puedes disfrutar de todos nuestros servicios.
                                </p>
                                
                                <!-- Success Card -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                                    <tr>
                                        <td style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 32px;">
                                            <h3 style="margin: 0 0 20px 0; color: #047857; font-size: 20px; font-weight: 700; text-align: center;">
                                                Que puedes hacer ahora?
                                            </h3>
                                            
                                            <!-- Features Grid -->
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td width="50%" style="padding: 16px 12px; vertical-align: top;">
                                                        <div style="text-align: center;">
                                                            <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
                                                            <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6; font-weight: 600;">
                                                                Buscar vuelos
                                                            </p>
                                                            <p style="margin: 4px 0 0 0; color: #047857; font-size: 13px; line-height: 1.5;">
                                                                Mas de 50 destinos internacionales
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td width="50%" style="padding: 16px 12px; vertical-align: top;">
                                                        <div style="text-align: center;">
                                                            <div style="font-size: 40px; margin-bottom: 12px;">💰</div>
                                                            <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6; font-weight: 600;">
                                                                Comparar precios
                                                            </p>
                                                            <p style="margin: 4px 0 0 0; color: #047857; font-size: 13px; line-height: 1.5;">
                                                                Tarifas en tiempo real
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td width="50%" style="padding: 16px 12px; vertical-align: top;">
                                                        <div style="text-align: center;">
                                                            <div style="font-size: 40px; margin-bottom: 12px;">🎫</div>
                                                            <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6; font-weight: 600;">
                                                                Reservar asientos
                                                            </p>
                                                            <p style="margin: 4px 0 0 0; color: #047857; font-size: 13px; line-height: 1.5;">
                                                                Clase economica o ejecutiva
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td width="50%" style="padding: 16px 12px; vertical-align: top;">
                                                        <div style="text-align: center;">
                                                            <div style="font-size: 40px; margin-bottom: 12px;">📱</div>
                                                            <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6; font-weight: 600;">
                                                                Billetes electronicos
                                                            </p>
                                                            <p style="margin: 4px 0 0 0; color: #047857; font-size: 13px; line-height: 1.5;">
                                                                Gestion facil de tus vuelos
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- CTA Message -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px;">
                                    <tr>
                                        <td style="text-align: center;">
                                            <p style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 600;">
                                                Listo para tu proxima aventura?
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                            </td>
                        </tr>
                        
                        <!-- Modern Footer -->
                        <tr>
                            <td style="background: #0f172a; padding: 32px 40px; text-align: center;">
                                <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 14px; font-weight: 500;">
                                    Boleteria JB
                                </p>
                                <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px;">
                                    Gracias por confiar en nosotros para tus viajes
                                </p>
                                <div style="border-top: 1px solid #334155; padding-top: 16px; margin-top: 16px;">
                                    <p style="margin: 0; color: #64748b; font-size: 12px;">
                                        © 2025 Boleteria JB. Todos los derechos reservados.
                                    </p>
                                    <p style="margin: 8px 0 0 0; color: #475569; font-size: 11px;">
                                        Este es un correo automatico, por favor no responder directamente.
                                    </p>
                                </div>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    try:
        _send_email(email, "Bienvenido a Boleteria JB", html_content)
        print(f"✅ Email de bienvenida enviado exitosamente a {email}\n")
    except Exception as e:
        print(f"❌ Error enviando email de bienvenida a {email}: {str(e)}\n")
        raise e


def send_ticket_email(email: EmailStr, codigo_billete: str, nombre: str, reserva_codigo: str):
        """Enviar email con el billete electrónico al usuario.

        Esta función envía un correo simple con el código del billete y
        un enlace/instrucción para ver el billete en la aplicación.
        """
        frontend = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        billete_url = f"{frontend}/billetes/{codigo_billete}"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width:600px;margin:20px auto;padding:20px;border-radius:8px;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                    <h2 style="color:#0ea5a0;">✈️ Tu billete electrónico</h2>
                    <p>Hola {nombre},</p>
                    <p>Gracias por tu compra. Tu billete ha sido emitido correctamente.</p>
                    <div style="padding:12px;background:#f1f5f9;border-radius:6px;margin:12px 0;">
                        <strong>Código de billete:</strong> <span style="font-family:monospace;color:#3b82f6;">{codigo_billete}</span><br/>
                        <strong>Código de reserva:</strong> <span style="font-family:monospace;">{reserva_codigo}</span>
                    </div>
                    <p>Para ver los detalles del billete inicia sesión en la aplicación y ve a <strong>Mis Billetes</strong>.</p>
                    <p style="margin-top:18px;text-align:center;">
                        <a href="{billete_url}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#3b82f6;color:white;text-decoration:none;">Ver billete</a>
                    </p>
                    <p style="font-size:12px;color:#6b7280;margin-top:18px;">Si no solicitaste este billete, contacta a soporte: soporte@boleteriajb.com</p>
                </div>
            </body>
        </html>
        """

        try:
                _send_email(email, f"✈️ Billete - {codigo_billete}", html_content)
        except Exception as e:
                # Loguear pero no interrumpir el flujo principal
                try:
                        print(f"Error enviando email de billete a {email}: {e}")
                except:
                        pass

def send_password_reset_email(email: EmailStr, token: str, nombre: str):
    """Enviar email de recuperación de contraseña"""
    
    print(f"\n🔐 Preparando email de RECUPERACIÓN DE CONTRASEÑA para {email}")
    
    # URL de recuperación
    reset_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/recuperar-password?token={token}"
    
    print(f"🔗 URL de recuperación: {reset_url}")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #f59e0b, #d97706);
                padding: 40px 20px;
                text-align: center;
                color: white;
            }}
            .header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }}
            .header p {{
                margin: 10px 0 0 0;
                font-size: 14px;
                opacity: 0.9;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .content h2 {{
                color: #1f2937;
                font-size: 22px;
                margin-top: 0;
            }}
            .content p {{
                color: #4b5563;
                font-size: 16px;
                line-height: 1.8;
            }}
            .button {{
                display: inline-block;
                padding: 16px 40px;
                background-color: #f59e0b;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 18px;
                margin: 20px 0;
                border: none;
                box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);
            }}
            .button:hover {{
                background-color: #d97706;
            }}
            .button-wrapper {{
                text-align: center;
                margin: 30px 0;
            }}
            .warning-box {{
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                margin: 20px 0;
                border-radius: 6px;
            }}
            .warning-box p {{
                margin: 0;
                font-size: 14px;
                color: #92400e;
            }}
            .footer {{
                background: #f9fafb;
                padding: 24px 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }}
            .footer p {{
                margin: 5px 0;
                font-size: 13px;
                color: #9ca3af;
            }}
            .footer a {{
                color: #f59e0b;
                text-decoration: none;
            }}
            .icon {{
                font-size: 48px;
                margin-bottom: 10px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="icon">🔐</div>
                <h1>Recuperación de Contraseña</h1>
                <p>Boletería JB</p>
            </div>
            
            <div class="content">
                <h2>Hola, {nombre} 👋</h2>
                
                <p>
                    Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Boletería JB</strong>.
                </p>
                
                <p>
                    Si fuiste tú quien solicitó este cambio, haz clic en el siguiente botón para crear una nueva contraseña:
                </p>
                
                <div class="button-wrapper">
                    <a href="{reset_url}" class="button" style="display: inline-block; padding: 16px 40px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
                        🔑 Restablecer Contraseña
                    </a>
                </div>
                
                <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
                    O copia y pega este enlace en tu navegador:<br>
                    <a href="{reset_url}" style="color: #f59e0b; word-break: break-all;">{reset_url}</a>
                </p>
                
                <div class="warning-box">
                    <p>
                        <strong>⏰ Importante:</strong> Este enlace expirará en <strong>1 hora</strong> por seguridad. Si no lo usas en ese tiempo, deberás solicitar uno nuevo.
                    </p>
                </div>
                
                <p style="margin-top: 30px;">
                    <strong>🛡️ ¿No solicitaste este cambio?</strong><br>
                    Si no fuiste tú quien solicitó restablecer la contraseña, puedes ignorar este correo de forma segura. Tu contraseña actual seguirá siendo válida y tu cuenta estará protegida.
                </p>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                    Por tu seguridad, nunca compartas este enlace con nadie ni lo reenvíes. El equipo de Boletería JB nunca te pedirá tu contraseña por correo electrónico.
                </p>
            </div>
            
            <div class="footer">
                <p>© 2025 Boletería JB - Sistema de Reservación de Vuelos</p>
                <p>Este es un correo automático, por favor no respondas directamente.</p>
                <p>
                    ¿Necesitas ayuda? <a href="mailto:soporte@boleteriajb.com">Contacta a Soporte</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        _send_email(email, "🔐 Recuperación de Contraseña - Boletería JB", html_content)
        print(f"✅ Email de recuperación enviado exitosamente a {email}\n")
    except Exception as e:
        print(f"❌ Error enviando email de recuperación a {email}: {str(e)}\n")
        raise e
