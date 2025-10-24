from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import random
import string

from database import get_db
from models import (
    Usuario, Reserva, Pago, TarjetaCredito, Billete, DetalleReserva
)
from schemas import (
    PagoCreate,
    PagoResponse,
    TarjetaCreditoCreate,
    TarjetaCreditoResponse,
    BilleteResponse
)
from auth import get_current_active_user
from email_config import send_ticket_email, MAIL_USERNAME
import threading

router = APIRouter(prefix="/pagos", tags=["Pagos y Billetes"])

def generar_codigo_billete() -> str:
    """Generar código único de billete"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=15))

def generar_numero_autorizacion() -> str:
    """Simular número de autorización de pago"""
    return ''.join(random.choices(string.digits, k=12))

@router.post("/tarjetas", response_model=TarjetaCreditoResponse, status_code=status.HTTP_201_CREATED)
def agregar_tarjeta(
    tarjeta_data: TarjetaCreditoCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Agregar una nueva tarjeta de crédito al perfil del usuario"""
    
    # En producción, aquí se validaría la tarjeta con un procesador de pagos
    tarjeta = TarjetaCredito(
        usuario_id=current_user.id,
        numero_tarjeta=tarjeta_data.numero_tarjeta,
        nombre_titular=tarjeta_data.nombre_titular,
        fecha_expiracion=tarjeta_data.fecha_expiracion,
        cvv=tarjeta_data.cvv,
        tipo=tarjeta_data.tipo
    )
    
    db.add(tarjeta)
    db.commit()
    db.refresh(tarjeta)
    
    return tarjeta

@router.get("/tarjetas", response_model=List[TarjetaCreditoResponse])
def listar_tarjetas(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtener todas las tarjetas del usuario"""
    tarjetas = db.query(TarjetaCredito).filter(
        TarjetaCredito.usuario_id == current_user.id
    ).all()
    
    # En producción, solo mostrar últimos 4 dígitos
    return tarjetas

@router.delete("/tarjetas/{tarjeta_id}")
def eliminar_tarjeta(
    tarjeta_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Eliminar una tarjeta de crédito"""
    tarjeta = db.query(TarjetaCredito).filter(
        TarjetaCredito.id == tarjeta_id,
        TarjetaCredito.usuario_id == current_user.id
    ).first()
    
    if not tarjeta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarjeta no encontrada"
        )
    
    db.delete(tarjeta)
    db.commit()
    
    return {"message": "Tarjeta eliminada exitosamente"}

@router.post("/procesar", response_model=PagoResponse, status_code=status.HTTP_201_CREATED)
def procesar_pago(
    pago_data: PagoCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Procesar el pago de una reserva y generar billetes"""
    
    # Verificar que la reserva existe y pertenece al usuario
    reserva = db.query(Reserva).filter(
        Reserva.id == pago_data.reserva_id,
        Reserva.usuario_id == current_user.id
    ).first()
    
    if not reserva:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva no encontrada"
        )
    
    if reserva.estado != "PENDIENTE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La reserva está en estado {reserva.estado} y no puede ser pagada"
        )
    
    # Verificar que la tarjeta existe y pertenece al usuario
    tarjeta = db.query(TarjetaCredito).filter(
        TarjetaCredito.id == pago_data.tarjeta_id,
        TarjetaCredito.usuario_id == current_user.id
    ).first()
    
    if not tarjeta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarjeta no encontrada"
        )
    
    # Simular procesamiento de pago
    # En producción, aquí se integraría con un procesador de pagos (Stripe, PayPal, etc.)
    numero_autorizacion = generar_numero_autorizacion()
    
    # Crear registro de pago
    pago = Pago(
        reserva_id=reserva.id,
        tarjeta_id=tarjeta.id,
        monto=reserva.total,
        estado="APROBADO",
        numero_autorizacion=numero_autorizacion
    )
    
    db.add(pago)
    
    # Actualizar estado de la reserva
    reserva.estado = "CONFIRMADA"
    
    # Agrupar detalles por vuelo (instancia_vuelo_id)
    from collections import defaultdict
    detalles_por_vuelo = defaultdict(list)
    for detalle in reserva.detalles:
        detalles_por_vuelo[detalle.instancia_vuelo_id].append(detalle)

    for instancia_id, detalles_vuelo in detalles_por_vuelo.items():
        for detalle in detalles_vuelo:
            codigo_billete = generar_codigo_billete()
            # Crear un billete por pasajero
            billete = Billete(
                codigo_billete=codigo_billete,
                detalle_reserva_id=detalle.id,
                metodo_entrega=pago_data.metodo_entrega,
                estado="EMITIDO"
            )
            db.add(billete)
            detalle.billete_id = billete.id

            # Enviar email solo una vez por billete
            try:
                if pago_data.metodo_entrega and pago_data.metodo_entrega.upper() == "EMAIL":
                    if MAIL_USERNAME:
                        usuario_email = current_user.email
                        nombre_usuario = current_user.nombre
                        reserva_codigo = reserva.codigo_reserva
                        threading.Thread(
                            target=send_ticket_email,
                            args=(usuario_email, codigo_billete, nombre_usuario, reserva_codigo),
                            daemon=True
                        ).start()
                    else:
                        print("MAIL_USERNAME no configurado; omitiendo envío de email de billete.")
            except Exception as e:
                try:
                    print(f"Error iniciando envío de email en background: {e}")
                except:
                    pass
    
    db.commit()
    db.refresh(pago)
    
    return pago

@router.get("/historial", response_model=List[PagoResponse])
def historial_pagos(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtener historial de pagos del usuario"""
    pagos = db.query(Pago).join(Reserva).filter(
        Reserva.usuario_id == current_user.id
    ).order_by(Pago.fecha_pago.desc()).all()
    
    return pagos

@router.get("/billetes")
def listar_billetes(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtener todos los billetes del usuario con información del vuelo"""
    billetes = db.query(Billete).join(
        DetalleReserva
    ).join(
        Reserva
    ).filter(
        Reserva.usuario_id == current_user.id
    ).order_by(Billete.fecha_emision.desc()).all()
    
    # Enriquecer con información del vuelo para filtros
    resultado = []
    for billete in billetes:
        detalle = billete.detalle_reserva
        instancia = detalle.instancia_vuelo
        vuelo = instancia.vuelo
        
        # Verificar si ya se realizó check-in
        check_in_realizado = billete.check_in is not None
        
        resultado.append({
            "codigo_billete": billete.codigo_billete,
            "fecha_emision": str(billete.fecha_emision),
            "metodo_entrega": billete.metodo_entrega,
            "estado": billete.estado,
            "pasajero": f"{detalle.pasajero_nombre} {detalle.pasajero_apellido}",
            "check_in_realizado": check_in_realizado,
            "vuelo": {
                "numero_vuelo": vuelo.numero_vuelo,
                "fecha": str(instancia.fecha),
                "origen": vuelo.ciudad_origen.codigo_iata,
                "destino": vuelo.ciudad_destino.codigo_iata
            }
        })
    
    return resultado

@router.get("/billetes/{codigo_billete}")
def obtener_billete(
    codigo_billete: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtener detalles completos de un billete"""
    billete = db.query(Billete).join(
        DetalleReserva
    ).join(
        Reserva
    ).filter(
        Billete.codigo_billete == codigo_billete,
        Reserva.usuario_id == current_user.id
    ).first()
    
    if not billete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billete no encontrado"
        )
    
    detalle = billete.detalle_reserva
    instancia = detalle.instancia_vuelo
    vuelo = instancia.vuelo
    reserva = detalle.reserva
    
    return {
        "billete": {
            "codigo": billete.codigo_billete,
            "fecha_emision": str(billete.fecha_emision),
            "metodo_entrega": billete.metodo_entrega,
            "estado": billete.estado
        },
        "pasajero": {
            "nombre": detalle.pasajero_nombre,
            "apellido": detalle.pasajero_apellido
        },
        "vuelo": {
            "numero_vuelo": vuelo.numero_vuelo,
            "aerolinea": vuelo.aerolinea.nombre,
            "origen": f"{vuelo.ciudad_origen.nombre} ({vuelo.ciudad_origen.codigo_iata})",
            "destino": f"{vuelo.ciudad_destino.nombre} ({vuelo.ciudad_destino.codigo_iata})",
            "fecha": str(instancia.fecha),
            "hora_salida": str(vuelo.hora_salida),
            "hora_llegada": str(vuelo.hora_llegada),
            "puerta": instancia.puerta
        },
        "asiento": {
            "numero": detalle.asiento.numero_asiento if detalle.asiento else "No asignado",
            "clase": detalle.clase
        },
        "precio": float(detalle.precio),
        "reserva_codigo": detalle.reserva.codigo_reserva
    }
