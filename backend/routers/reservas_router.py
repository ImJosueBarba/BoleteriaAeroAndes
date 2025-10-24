from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import random
import string
from datetime import datetime

from database import get_db
from models import (
    Usuario, Reserva, DetalleReserva, InstanciaVuelo,
    Asiento, Vuelo, Tarifa
)
from models import Billete
from schemas import (
    ReservaCreate,
    ReservaResponse,
    DetalleReservaCreate
)
from auth import get_current_active_user

router = APIRouter(prefix="/reservas", tags=["Reservas"])

def generar_codigo_reserva() -> str:
    """Generar código único de reserva"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))

@router.post("/", response_model=ReservaResponse, status_code=status.HTTP_201_CREATED)
def crear_reserva(
    reserva_data: ReservaCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Crear una nueva reserva de vuelo(s)"""
    
    total = 0
    detalles_lista = []
    
    # Procesar cada detalle de reserva
    for detalle_data in reserva_data.detalles:
        # Verificar que la instancia de vuelo existe
        instancia = db.query(InstanciaVuelo).filter(
            InstanciaVuelo.id == detalle_data.instancia_vuelo_id
        ).first()
        
        if not instancia:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Instancia de vuelo {detalle_data.instancia_vuelo_id} no encontrada"
            )
        
        # Obtener la tarifa para esa clase
        tarifa = db.query(Tarifa).filter(
            Tarifa.vuelo_id == instancia.vuelo_id,
            Tarifa.clase == detalle_data.clase,
            Tarifa.fecha_inicio <= instancia.fecha
        ).first()
        
        if not tarifa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tarifa no encontrada para clase {detalle_data.clase}"
            )
        
        # Verificar disponibilidad de asientos
        if detalle_data.clase == "ECONOMICA":
            asientos_disp = instancia.asientos_disponibles_economica
        elif detalle_data.clase == "EJECUTIVA":
            asientos_disp = instancia.asientos_disponibles_ejecutiva
        else:
            asientos_disp = instancia.asientos_disponibles_primera
        
        if asientos_disp < len(detalle_data.pasajeros):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No hay suficientes asientos disponibles en clase {detalle_data.clase}"
            )
        
        # Crear detalles para cada pasajero
        for pasajero in detalle_data.pasajeros:
            asiento_id = None
            
            # Si se especificó número de asiento, asignarlo
            if pasajero.asiento_numero:
                asiento = db.query(Asiento).filter(
                    Asiento.vuelo_id == instancia.vuelo_id,
                    Asiento.numero_asiento == pasajero.asiento_numero,
                    Asiento.clase == detalle_data.clase,
                    Asiento.disponible == True
                ).first()
                
                if not asiento:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Asiento {pasajero.asiento_numero} no disponible en clase {detalle_data.clase}"
                    )
                
                asiento.disponible = False
                asiento_id = asiento.id
            
            # Crear detalle de reserva
            detalle = DetalleReserva(
                instancia_vuelo_id=instancia.id,
                pasajero_nombre=pasajero.nombre,
                pasajero_apellido=pasajero.apellido,
                asiento_id=asiento_id,
                clase=detalle_data.clase,
                precio=tarifa.precio
            )
            
            detalles_lista.append(detalle)
            total += float(tarifa.precio)
        
        # Actualizar asientos disponibles
        if detalle_data.clase == "ECONOMICA":
            instancia.asientos_disponibles_economica -= len(detalle_data.pasajeros)
        elif detalle_data.clase == "EJECUTIVA":
            instancia.asientos_disponibles_ejecutiva -= len(detalle_data.pasajeros)
        else:
            instancia.asientos_disponibles_primera -= len(detalle_data.pasajeros)
    
    # Crear la reserva
    codigo_reserva = generar_codigo_reserva()
    reserva = Reserva(
        codigo_reserva=codigo_reserva,
        usuario_id=current_user.id,
        total=total,
        estado="PENDIENTE"
    )
    
    db.add(reserva)
    db.commit()
    db.refresh(reserva)
    
    # Agregar detalles a la reserva
    for detalle in detalles_lista:
        detalle.reserva_id = reserva.id
        db.add(detalle)
    
    db.commit()
    db.refresh(reserva)
    
    return reserva

@router.get("/", response_model=List[ReservaResponse])
def listar_reservas(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtener todas las reservas del usuario actual"""
    reservas = db.query(Reserva).filter(
        Reserva.usuario_id == current_user.id
    ).order_by(Reserva.fecha_reserva.desc()).all()
    
    return reservas

@router.get("/{codigo_reserva}", response_model=ReservaResponse)
def obtener_reserva(
    codigo_reserva: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtener detalles de una reserva específica"""
    reserva = db.query(Reserva).filter(
        Reserva.codigo_reserva == codigo_reserva,
        Reserva.usuario_id == current_user.id
    ).first()
    
    if not reserva:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva no encontrada"
        )
    
    return reserva

@router.delete("/{codigo_reserva}")
def cancelar_reserva(
    codigo_reserva: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancelar una reserva"""
    reserva = db.query(Reserva).filter(
        Reserva.codigo_reserva == codigo_reserva,
        Reserva.usuario_id == current_user.id
    ).first()
    
    if not reserva:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva no encontrada"
        )
    
    if reserva.estado == "CANCELADA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La reserva ya está cancelada"
        )
    
    # Liberar asientos y actualizar disponibilidad
    for detalle in reserva.detalles:
        if detalle.asiento_id:
            asiento = db.query(Asiento).filter(Asiento.id == detalle.asiento_id).first()
            if asiento:
                asiento.disponible = True
        
        # Actualizar disponibilidad en instancia de vuelo
        instancia = detalle.instancia_vuelo
        if detalle.clase == "ECONOMICA":
            instancia.asientos_disponibles_economica += 1
        elif detalle.clase == "EJECUTIVA":
            instancia.asientos_disponibles_ejecutiva += 1
        else:
            instancia.asientos_disponibles_primera += 1

        # Actualizar estado del billete asociado (si existe)
        try:
            billete = db.query(Billete).filter(Billete.detalle_reserva_id == detalle.id).first()
            if billete:
                billete.estado = "CANCELADO"
                db.add(billete)
        except Exception:
            # No queremos que la cancelación de la reserva falle por un error al actualizar billetes
            pass
    
    reserva.estado = "CANCELADA"
    db.commit()
    
    return {"message": "Reserva cancelada exitosamente", "codigo_reserva": codigo_reserva}

@router.post("/check-in/{codigo_billete}")
def hacer_check_in(
    codigo_billete: str,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Realizar check-in online para un billete (disponible 24-3 horas antes del vuelo)"""
    from models import CheckIn
    from datetime import datetime, timedelta
    
    # Buscar el billete
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
    
    # Verificar que el billete esté emitido
    if billete.estado != "EMITIDO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El billete está en estado {billete.estado} y no puede hacer check-in"
        )
    
    # Verificar que no haya check-in previo
    check_in_existente = db.query(CheckIn).filter(CheckIn.billete_id == billete.id).first()
    if check_in_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya se realizó check-in para este billete"
        )
    
    # Obtener información del vuelo
    detalle = billete.detalle_reserva
    instancia = detalle.instancia_vuelo
    vuelo = instancia.vuelo
    
    # Calcular fecha/hora del vuelo
    fecha_vuelo = datetime.combine(instancia.fecha, vuelo.hora_salida)
    ahora = datetime.now()
    
    # Verificar ventana de check-in: 24 horas antes hasta 3 horas antes
    ventana_inicio = fecha_vuelo - timedelta(hours=24)
    ventana_fin = fecha_vuelo - timedelta(hours=3)
    
    if ahora < ventana_inicio:
        horas_faltantes = int((ventana_inicio - ahora).total_seconds() / 3600)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El check-in estará disponible en {horas_faltantes} horas (24h antes del vuelo)"
        )
    
    if ahora > ventana_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El check-in ya cerró. Debe realizarlo en el aeropuerto"
        )
    
    # Crear check-in
    check_in = CheckIn(
        billete_id=billete.id,
        asiento_asignado=detalle.asiento.numero_asiento if detalle.asiento else None,
        puerta_embarque=instancia.puerta
    )
    
    db.add(check_in)
    db.commit()
    db.refresh(check_in)
    
    return {
        "message": "Check-in realizado exitosamente",
        "billete_codigo": billete.codigo_billete,
        "fecha_check_in": str(check_in.fecha_check_in),
        "asiento": check_in.asiento_asignado,
        "puerta": check_in.puerta_embarque,
        "vuelo": {
            "numero": vuelo.numero_vuelo,
            "fecha": str(instancia.fecha),
            "hora_salida": str(vuelo.hora_salida)
        }
    }
