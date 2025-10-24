from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import re

from database import get_db
from models import Usuario
from schemas import UsuarioCreate, UsuarioResponse, Token, ReenviarVerificacionRequest
from auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_active_user,
    generate_verification_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from email_config import send_verification_email, send_welcome_email

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/registro", status_code=status.HTTP_201_CREATED)
async def registrar_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    """Registrar un nuevo usuario en el sistema - Envía email de verificación"""
    
    # Validar formato de email
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, usuario.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de email inválido"
        )
    
    # Validar longitud de nombre y apellido
    if len(usuario.nombre.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre debe tener al menos 2 caracteres"
        )
    
    if len(usuario.apellido.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El apellido debe tener al menos 2 caracteres"
        )
    
    # Validar contraseña fuerte
    if len(usuario.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 6 caracteres"
        )
    
    # Validar longitud máxima de contraseña (límite de bcrypt es 72 bytes)
    if len(usuario.password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña es demasiado larga (máximo 72 caracteres)"
        )
    
    # Validar teléfono si se proporciona
    if usuario.telefono:
        telefono_limpio = re.sub(r'[^\d]', '', usuario.telefono)
        if len(telefono_limpio) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El teléfono debe tener al menos 10 dígitos"
            )
    
    # Verificar si el email ya existe
    db_user = db.query(Usuario).filter(Usuario.email == usuario.email.lower()).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Generar token de verificación
    verification_token = generate_verification_token()
    token_expiration = datetime.utcnow() + timedelta(hours=24)
    
    # Crear nuevo usuario (sin verificar)
    hashed_password = get_password_hash(usuario.password)
    db_user = Usuario(
        email=usuario.email.lower().strip(),
        password_hash=hashed_password,
        nombre=usuario.nombre.strip().title(),
        apellido=usuario.apellido.strip().title(),
        telefono=usuario.telefono.strip() if usuario.telefono else None,
        email_verificado=False,
        token_verificacion=verification_token,
        token_expiracion=token_expiration
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Enviar email de verificación
    try:
        send_verification_email(
            email=db_user.email,
            token=verification_token,
            nombre=db_user.nombre
        )
        print(f"✅ Email de verificación enviado exitosamente a {db_user.email}")
    except Exception as e:
        # No eliminar el usuario, solo registrar el error
        print(f"⚠️ Error al enviar email de verificación a {db_user.email}: {str(e)}")
        # El usuario puede solicitar reenvío del email después
    
    return {
        "message": "Usuario registrado exitosamente. Por favor, verifica tu correo electrónico.",
        "email": db_user.email
    }

@router.get("/verificar-email/{token}")
async def verificar_email(token: str, db: Session = Depends(get_db)):
    """Verificar email del usuario con el token recibido"""
    
    # Buscar usuario por token
    user = db.query(Usuario).filter(Usuario.token_verificacion == token).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token de verificación inválido"
        )
    
    # Verificar si el token ya expiró
    if user.token_expiracion and user.token_expiracion < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de verificación ha expirado. Por favor, solicita uno nuevo."
        )
    
    # Verificar si ya está verificado
    if user.email_verificado:
        return {
            "message": "El email ya ha sido verificado anteriormente",
            "email": user.email
        }
    
    # Actualizar usuario como verificado
    user.email_verificado = True
    user.token_verificacion = None
    user.token_expiracion = None
    
    db.commit()
    db.refresh(user)
    
    # Enviar email de bienvenida
    try:
        send_welcome_email(
            email=user.email,
            nombre=user.nombre
        )
    except Exception as e:
        # No fallar si el email de bienvenida no se envía
        print(f"Error enviando email de bienvenida: {str(e)}")
    
    return {
        "message": "Email verificado exitosamente. Ya puedes iniciar sesión.",
        "email": user.email
    }

@router.post("/reenviar-verificacion")
async def reenviar_verificacion(data: ReenviarVerificacionRequest, db: Session = Depends(get_db)):
    """Reenviar email de verificación"""
    
    user = db.query(Usuario).filter(Usuario.email == data.email.lower()).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe un usuario con ese email"
        )
    
    if user.email_verificado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email ya ha sido verificado"
        )
    
    # Generar nuevo token
    verification_token = generate_verification_token()
    token_expiration = datetime.utcnow() + timedelta(hours=24)
    
    user.token_verificacion = verification_token
    user.token_expiracion = token_expiration
    
    db.commit()
    
    # Enviar email
    try:
        send_verification_email(
            email=user.email,
            token=verification_token,
            nombre=user.nombre
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al enviar el email de verificación"
        )
    
    return {
        "message": "Email de verificación reenviado exitosamente",
        "email": user.email
    }

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Iniciar sesión y obtener token JWT"""
    
    # Validar que los campos no estén vacíos
    if not form_data.username or not form_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email y contraseña son requeridos"
        )
    
    # Validar formato de email
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, form_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de email inválido"
        )
    
    # Intentar autenticar
    user = authenticate_user(db, form_data.username.lower(), form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verificar que la cuenta esté activa
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta ha sido desactivada. Contacte al administrador"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/perfil", response_model=UsuarioResponse)
def obtener_perfil(current_user: Usuario = Depends(get_current_active_user)):
    """Obtener información del perfil del usuario actual"""
    return current_user

@router.put("/perfil", response_model=UsuarioResponse)
def actualizar_perfil(
    nombre: str = None,
    apellido: str = None,
    telefono: str = None,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Actualizar información del perfil del usuario"""
    
    # Validar nombre si se proporciona
    if nombre:
        if len(nombre.strip()) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre debe tener al menos 2 caracteres"
            )
        current_user.nombre = nombre.strip().title()
    
    # Validar apellido si se proporciona
    if apellido:
        if len(apellido.strip()) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El apellido debe tener al menos 2 caracteres"
            )
        current_user.apellido = apellido.strip().title()
    
    # Validar teléfono si se proporciona
    if telefono:
        telefono_limpio = re.sub(r'[^\d]', '', telefono)
        if len(telefono_limpio) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El teléfono debe tener al menos 10 dígitos"
            )
        current_user.telefono = telefono.strip()
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.put("/cambiar-password")
def cambiar_password(
    password_actual: str,
    password_nueva: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cambiar la contraseña del usuario"""
    from auth import verify_password
    
    # Verificar contraseña actual
    if not verify_password(password_actual, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )
    
    # Validar nueva contraseña
    if len(password_nueva) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres"
        )
    
    if len(password_nueva.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña es demasiado larga (máximo 72 caracteres)"
        )
    
    # Actualizar contraseña
    current_user.password_hash = get_password_hash(password_nueva)
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente"}

@router.delete("/perfil")
def eliminar_cuenta(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Eliminar la cuenta del usuario (desactivar)"""
    current_user.activo = False
    db.commit()
    
    return {"message": "Cuenta desactivada exitosamente"}

@router.post("/solicitar-recuperacion-password")
async def solicitar_recuperacion_password(email: str, db: Session = Depends(get_db)):
    """Solicitar recuperación de contraseña - Envía email con token"""
    
    # Validar formato de email
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de email inválido"
        )
    
    # Buscar usuario
    user = db.query(Usuario).filter(Usuario.email == email.lower()).first()
    
    # Por seguridad, siempre devolver el mismo mensaje aunque el usuario no exista
    # Esto previene que se pueda enumerar usuarios válidos
    if not user:
        return {
            "message": "Si existe una cuenta con ese email, recibirás un correo con instrucciones para recuperar tu contraseña",
            "email": email
        }
    
    # Verificar que la cuenta esté activa
    if not user.activo:
        return {
            "message": "Si existe una cuenta con ese email, recibirás un correo con instrucciones para recuperar tu contraseña",
            "email": email
        }
    
    # Generar token de recuperación (1 hora de validez)
    recovery_token = generate_verification_token()
    token_expiration = datetime.utcnow() + timedelta(hours=1)
    
    user.token_verificacion = recovery_token
    user.token_expiracion = token_expiration
    
    db.commit()
    
    # Enviar email de recuperación
    try:
        from email_config import send_password_reset_email
        send_password_reset_email(
            email=user.email,
            token=recovery_token,
            nombre=user.nombre
        )
    except Exception as e:
        print(f"Error enviando email de recuperación: {str(e)}")
        # No fallar, ya que esto es información sensible
    
    return {
        "message": "Si existe una cuenta con ese email, recibirás un correo con instrucciones para recuperar tu contraseña",
        "email": email
    }

@router.post("/recuperar-password")
async def recuperar_password(token: str, nueva_password: str, db: Session = Depends(get_db)):
    """Cambiar contraseña usando el token de recuperación"""
    
    # Validar nueva contraseña
    if len(nueva_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 6 caracteres"
        )
    
    if len(nueva_password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña es demasiado larga (máximo 72 caracteres)"
        )
    
    # Buscar usuario por token
    user = db.query(Usuario).filter(Usuario.token_verificacion == token).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token de recuperación inválido o expirado"
        )
    
    # Verificar si el token expiró
    if user.token_expiracion and user.token_expiracion < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de recuperación ha expirado. Por favor, solicita uno nuevo."
        )
    
    # Verificar que la cuenta esté activa
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta ha sido desactivada"
        )
    
    # Actualizar contraseña
    user.password_hash = get_password_hash(nueva_password)
    user.token_verificacion = None
    user.token_expiracion = None
    
    db.commit()
    
    return {
        "message": "Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.",
        "email": user.email
    }
