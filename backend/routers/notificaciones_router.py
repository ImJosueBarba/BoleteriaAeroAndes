from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List
from datetime import datetime

from database import get_db
from models import Notificacion, Usuario
from auth import get_current_active_user

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])

@router.get("/")
def listar_notificaciones(
    solo_no_leidas: bool = False,
    limite: int = 50,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtener notificaciones del usuario actual"""
    query = db.query(Notificacion).filter(
        Notificacion.usuario_id == current_user.id
    )
    
    if solo_no_leidas:
        query = query.filter(Notificacion.leido == False)
    
    notificaciones = query.order_by(
        Notificacion.fecha_creacion.desc()
    ).limit(limite).all()
    
    return {
        "notificaciones": [
            {
                "id": n.id,
                "tipo": n.tipo,
                "titulo": n.titulo,
                "mensaje": n.mensaje,
                "leido": n.leido,
                "fecha_creacion": str(n.fecha_creacion),
                "fecha_leido": str(n.fecha_leido) if n.fecha_leido else None,
                "metadata": n.datos_extra
            }
            for n in notificaciones
        ],
        "total": len(notificaciones),
        "no_leidas": db.query(Notificacion).filter(
            Notificacion.usuario_id == current_user.id,
            Notificacion.leido == False
        ).count()
    }

@router.get("/contador")
def contador_no_leidas(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtener cantidad de notificaciones no leídas"""
    count = db.query(Notificacion).filter(
        Notificacion.usuario_id == current_user.id,
        Notificacion.leido == False
    ).count()
    
    return {"no_leidas": count}

@router.patch("/{notificacion_id}/marcar-leida")
def marcar_como_leida(
    notificacion_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Marcar una notificación como leída"""
    notificacion = db.query(Notificacion).filter(
        Notificacion.id == notificacion_id,
        Notificacion.usuario_id == current_user.id
    ).first()
    
    if not notificacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada"
        )
    
    if not notificacion.leido:
        notificacion.leido = True
        notificacion.fecha_leido = datetime.now()
        db.commit()
    
    return {"message": "Notificación marcada como leída"}

@router.patch("/marcar-todas-leidas")
def marcar_todas_leidas(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Marcar todas las notificaciones del usuario como leídas"""
    notificaciones = db.query(Notificacion).filter(
        Notificacion.usuario_id == current_user.id,
        Notificacion.leido == False
    ).all()
    
    for notificacion in notificaciones:
        notificacion.leido = True
        notificacion.fecha_leido = datetime.now()
    
    db.commit()
    
    return {"message": f"{len(notificaciones)} notificaciones marcadas como leídas"}

@router.post("/crear")
def crear_notificacion_admin(
    tipo: str,
    titulo: str,
    mensaje: str,
    usuario_id: int,
    metadata: dict = None,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Crear una notificación para un usuario (endpoint administrativo)
    En producción, esto debería tener validación de permisos de admin
    """
    # Verificar que el usuario destino existe
    usuario_destino = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario_destino:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario destino no encontrado"
        )
    
    # Validar tipo
    tipos_validos = ['CAMBIO_VUELO', 'RECORDATORIO', 'OFERTA', 'CONFIRMACION', 'ALERTA']
    if tipo not in tipos_validos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo debe ser uno de: {', '.join(tipos_validos)}"
        )
    
    notificacion = Notificacion(
        usuario_id=usuario_id,
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        datos_extra=metadata
    )
    
    db.add(notificacion)
    db.commit()
    db.refresh(notificacion)
    
    return {
        "message": "Notificación creada exitosamente",
        "id": notificacion.id
    }

@router.delete("/{notificacion_id}")
def eliminar_notificacion(
    notificacion_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Eliminar una notificación"""
    notificacion = db.query(Notificacion).filter(
        Notificacion.id == notificacion_id,
        Notificacion.usuario_id == current_user.id
    ).first()
    
    if not notificacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada"
        )
    
    db.delete(notificacion)
    db.commit()
    
    return {"message": "Notificación eliminada"}
