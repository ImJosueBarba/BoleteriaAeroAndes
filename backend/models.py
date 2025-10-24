from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Time, Numeric, ForeignKey, UniqueConstraint, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    telefono = Column(String(20))
    fecha_registro = Column(DateTime, server_default=func.now())
    activo = Column(Boolean, default=True)
    email_verificado = Column(Boolean, default=False)
    token_verificacion = Column(String(255), nullable=True)
    token_expiracion = Column(DateTime, nullable=True)
    
    tarjetas = relationship("TarjetaCredito", back_populates="usuario", cascade="all, delete-orphan")
    reservas = relationship("Reserva", back_populates="usuario")

class TarjetaCredito(Base):
    __tablename__ = "tarjetas_credito"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    numero_tarjeta = Column(String(16), nullable=False)
    nombre_titular = Column(String(150), nullable=False)
    fecha_expiracion = Column(String(7), nullable=False)
    cvv = Column(String(4), nullable=False)
    tipo = Column(String(20), default="VISA")
    
    usuario = relationship("Usuario", back_populates="tarjetas")
    pagos = relationship("Pago", back_populates="tarjeta")

class Ciudad(Base):
    __tablename__ = "ciudades"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    codigo_iata = Column(String(3), unique=True, nullable=False)
    pais = Column(String(100), nullable=False)
    zona_horaria = Column(String(50))
    
    vuelos_origen = relationship("Vuelo", foreign_keys="Vuelo.ciudad_origen_id", back_populates="ciudad_origen")
    vuelos_destino = relationship("Vuelo", foreign_keys="Vuelo.ciudad_destino_id", back_populates="ciudad_destino")

class Aerolinea(Base):
    __tablename__ = "aerolineas"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    codigo_iata = Column(String(2), unique=True, nullable=False)
    pais = Column(String(100))
    activa = Column(Boolean, default=True)
    
    vuelos = relationship("Vuelo", back_populates="aerolinea")

class Vuelo(Base):
    __tablename__ = "vuelos"
    
    id = Column(Integer, primary_key=True, index=True)
    numero_vuelo = Column(String(10), unique=True, nullable=False)
    aerolinea_id = Column(Integer, ForeignKey("aerolineas.id"), nullable=False)
    ciudad_origen_id = Column(Integer, ForeignKey("ciudades.id"), nullable=False)
    ciudad_destino_id = Column(Integer, ForeignKey("ciudades.id"), nullable=False)
    hora_salida = Column(Time, nullable=False)
    hora_llegada = Column(Time, nullable=False)
    duracion_minutos = Column(Integer, nullable=False)
    dias_operacion = Column(String(7), default="1111111")
    activo = Column(Boolean, default=True)
    
    aerolinea = relationship("Aerolinea", back_populates="vuelos")
    ciudad_origen = relationship("Ciudad", foreign_keys=[ciudad_origen_id], back_populates="vuelos_origen")
    ciudad_destino = relationship("Ciudad", foreign_keys=[ciudad_destino_id], back_populates="vuelos_destino")
    tarifas = relationship("Tarifa", back_populates="vuelo", cascade="all, delete-orphan")
    asientos = relationship("Asiento", back_populates="vuelo", cascade="all, delete-orphan")
    instancias = relationship("InstanciaVuelo", back_populates="vuelo")

class Tarifa(Base):
    __tablename__ = "tarifas"
    
    id = Column(Integer, primary_key=True, index=True)
    vuelo_id = Column(Integer, ForeignKey("vuelos.id", ondelete="CASCADE"), nullable=False)
    clase = Column(String(20), nullable=False)
    precio = Column(Numeric(10, 2), nullable=False)
    moneda = Column(String(3), default="USD")
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date)
    
    vuelo = relationship("Vuelo", back_populates="tarifas")

class InstanciaVuelo(Base):
    __tablename__ = "instancias_vuelo"
    __table_args__ = (UniqueConstraint('vuelo_id', 'fecha', name='_vuelo_fecha_uc'),)
    
    id = Column(Integer, primary_key=True, index=True)
    vuelo_id = Column(Integer, ForeignKey("vuelos.id"), nullable=False)
    fecha = Column(Date, nullable=False, index=True)
    hora_salida_real = Column(DateTime)
    hora_llegada_real = Column(DateTime)
    estado = Column(String(20), default="PROGRAMADO")
    asientos_disponibles_economica = Column(Integer, default=150)
    asientos_disponibles_ejecutiva = Column(Integer, default=30)
    asientos_disponibles_primera = Column(Integer, default=10)
    puerta = Column(String(10))
    
    vuelo = relationship("Vuelo", back_populates="instancias")
    detalles_reserva = relationship("DetalleReserva", back_populates="instancia_vuelo")

class Asiento(Base):
    __tablename__ = "asientos"
    __table_args__ = (UniqueConstraint('vuelo_id', 'numero_asiento', name='_vuelo_asiento_uc'),)
    
    id = Column(Integer, primary_key=True, index=True)
    vuelo_id = Column(Integer, ForeignKey("vuelos.id"), nullable=False)
    numero_asiento = Column(String(5), nullable=False)
    clase = Column(String(20), nullable=False)
    disponible = Column(Boolean, default=True)
    
    vuelo = relationship("Vuelo", back_populates="asientos")
    detalles_reserva = relationship("DetalleReserva", back_populates="asiento")

class Reserva(Base):
    __tablename__ = "reservas"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo_reserva = Column(String(10), unique=True, nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_reserva = Column(DateTime, server_default=func.now())
    estado = Column(String(20), default="PENDIENTE")
    total = Column(Numeric(10, 2), nullable=False)
    
    usuario = relationship("Usuario", back_populates="reservas")
    detalles = relationship("DetalleReserva", back_populates="reserva", cascade="all, delete-orphan")
    pagos = relationship("Pago", back_populates="reserva")

class DetalleReserva(Base):
    __tablename__ = "detalles_reserva"
    
    id = Column(Integer, primary_key=True, index=True)
    reserva_id = Column(Integer, ForeignKey("reservas.id", ondelete="CASCADE"), nullable=False)
    instancia_vuelo_id = Column(Integer, ForeignKey("instancias_vuelo.id"), nullable=False)
    pasajero_nombre = Column(String(100), nullable=False)
    pasajero_apellido = Column(String(100), nullable=False)
    asiento_id = Column(Integer, ForeignKey("asientos.id"))
    clase = Column(String(20), nullable=False)
    precio = Column(Numeric(10, 2), nullable=False)
    
    reserva = relationship("Reserva", back_populates="detalles")
    instancia_vuelo = relationship("InstanciaVuelo", back_populates="detalles_reserva")
    asiento = relationship("Asiento", back_populates="detalles_reserva")
    billete = relationship("Billete", back_populates="detalle_reserva", uselist=False)

class Billete(Base):
    __tablename__ = "billetes"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo_billete = Column(String(15), unique=True, nullable=False)
    detalle_reserva_id = Column(Integer, ForeignKey("detalles_reserva.id"), nullable=False)
    fecha_emision = Column(DateTime, server_default=func.now())
    metodo_entrega = Column(String(20), default="EMAIL")
    estado = Column(String(20), default="EMITIDO")
    
    detalle_reserva = relationship("DetalleReserva", back_populates="billete")

class Pago(Base):
    __tablename__ = "pagos"
    
    id = Column(Integer, primary_key=True, index=True)
    reserva_id = Column(Integer, ForeignKey("reservas.id"), nullable=False)
    tarjeta_id = Column(Integer, ForeignKey("tarjetas_credito.id"), nullable=False)
    monto = Column(Numeric(10, 2), nullable=False)
    fecha_pago = Column(DateTime, server_default=func.now())
    estado = Column(String(20), default="APROBADO")
    numero_autorizacion = Column(String(50))
    
    reserva = relationship("Reserva", back_populates="pagos")
    tarjeta = relationship("TarjetaCredito", back_populates="pagos")

class CheckIn(Base):
    __tablename__ = "check_ins"
    
    id = Column(Integer, primary_key=True, index=True)
    billete_id = Column(Integer, ForeignKey("billetes.id", ondelete="CASCADE"), nullable=False, unique=True)
    fecha_check_in = Column(DateTime, server_default=func.now())
    asiento_asignado = Column(String(5))
    puerta_embarque = Column(String(10))
    
    billete = relationship("Billete", backref="check_in")

class Notificacion(Base):
    __tablename__ = "notificaciones"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(50), nullable=False)  # CAMBIO_VUELO, RECORDATORIO, OFERTA, CONFIRMACION, ALERTA
    titulo = Column(String(200), nullable=False)
    mensaje = Column(Text, nullable=False)
    leido = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_leido = Column(DateTime)
    datos_extra = Column("metadata", JSON)  # Datos adicionales opcionales - columna 'metadata' en DB
    
    usuario = relationship("Usuario", backref="notificaciones")

