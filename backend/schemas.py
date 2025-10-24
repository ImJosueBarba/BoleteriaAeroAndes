from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

# Schemas de Usuario
class UsuarioCreate(BaseModel):
    email: EmailStr
    nombre: str
    apellido: str
    telefono: Optional[str] = None
    password: str

class UsuarioResponse(BaseModel):
    id: int
    email: EmailStr
    nombre: str
    apellido: str
    telefono: Optional[str] = None
    fecha_registro: datetime
    activo: bool
    
    class Config:
        from_attributes = True

# Schemas de Tarjeta de Crédito
class TarjetaCreditoCreate(BaseModel):
    numero_tarjeta: str
    nombre_titular: str
    fecha_expiracion: str
    cvv: str
    tipo: str = "VISA"

class TarjetaCreditoResponse(BaseModel):
    id: int
    numero_tarjeta: str  # En producción, mostrar solo últimos 4 dígitos
    nombre_titular: str
    tipo: str
    
    class Config:
        from_attributes = True

# Schemas de Ciudad
class CiudadResponse(BaseModel):
    id: int
    nombre: str
    codigo_iata: str
    pais: str
    zona_horaria: Optional[str] = None
    
    class Config:
        from_attributes = True

# Schemas de Aerolínea
class AerolineaResponse(BaseModel):
    id: int
    nombre: str
    codigo_iata: str
    pais: Optional[str] = None
    activa: bool
    
    class Config:
        from_attributes = True

# Schemas de Búsqueda de Vuelos
class BusquedaVuelosRequest(BaseModel):
    origen: str  # Código IATA
    destino: str  # Código IATA
    fecha: date
    clase: Optional[str] = "ECONOMICA"
    aerolinea_codigo: Optional[str] = None
    solo_directos: bool = True
    horario_salida: Optional[str] = None  # morning, afternoon, evening, all
    precio_maximo: Optional[float] = None

class VueloDisponible(BaseModel):
    vuelo_id: int
    instancia_vuelo_id: Optional[int] = None  # ID de la instancia para crear la reserva
    numero_vuelo: str
    aerolinea: str
    origen: str
    destino: str
    fecha: date
    hora_salida: str
    hora_llegada: str
    duracion_minutos: int
    clase: str
    precio: Decimal
    asientos_disponibles: int
    
    class Config:
        from_attributes = True

# Schemas de Reserva
class PasajeroInfo(BaseModel):
    nombre: str
    apellido: str
    asiento_numero: Optional[str] = None

class DetalleReservaCreate(BaseModel):
    instancia_vuelo_id: int
    pasajeros: List[PasajeroInfo]
    clase: str

class ReservaCreate(BaseModel):
    detalles: List[DetalleReservaCreate]

class DetalleReservaResponse(BaseModel):
    id: int
    pasajero_nombre: str
    pasajero_apellido: str
    clase: str
    precio: Decimal
    instancia_vuelo_id: int
    asiento_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class ReservaResponse(BaseModel):
    id: int
    codigo_reserva: str
    usuario_id: int
    fecha_reserva: datetime
    estado: str
    total: Decimal
    detalles: List[DetalleReservaResponse]
    
    class Config:
        from_attributes = True

# Schemas de Pago
class PagoCreate(BaseModel):
    reserva_id: int
    tarjeta_id: int
    metodo_entrega: str = "EMAIL"

class PagoResponse(BaseModel):
    id: int
    reserva_id: int
    monto: Decimal
    fecha_pago: datetime
    estado: str
    numero_autorizacion: Optional[str] = None
    
    class Config:
        from_attributes = True

# Schemas de Billete
class BilleteResponse(BaseModel):
    id: int
    codigo_billete: str
    fecha_emision: datetime
    metodo_entrega: str
    estado: str
    detalle_reserva_id: int
    
    class Config:
        from_attributes = True

# Schema de Token JWT
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Schema para reenvío de verificación
class ReenviarVerificacionRequest(BaseModel):
    email: EmailStr
