// Tipos de datos para el frontend

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  fecha_registro: string;
  activo: boolean;
}

export interface Ciudad {
  id: number;
  nombre: string;
  codigo_iata: string;
  pais: string;
  zona_horaria?: string;
}

export interface Aerolinea {
  id: number;
  nombre: string;
  codigo_iata: string;
  pais?: string;
  activa: boolean;
}

export interface VueloDisponible {
  vuelo_id: number;
  instancia_vuelo_id?: number;  // ID de la instancia para crear la reserva
  numero_vuelo: string;
  aerolinea: string;
  origen: string;
  destino: string;
  fecha: string;
  hora_salida: string;
  hora_llegada: string;
  duracion_minutos: number;
  clase: string;
  precio: number;
  asientos_disponibles: number;
}

export interface BusquedaVuelos {
  origen: string;
  destino: string;
  fecha: string;
  clase?: string;
  aerolinea_codigo?: string;
  solo_directos?: boolean;
  horario_salida?: string;
  precio_maximo?: number;
}

export interface Pasajero {
  nombre: string;
  apellido: string;
  asiento_numero?: string;
}

export interface DetalleReserva {
  instancia_vuelo_id: number;
  pasajeros: Pasajero[];
  clase: string;
  asiento_numero?: string;
}

export interface ReservaCreate {
  detalles: DetalleReserva[];
}

export interface Reserva {
  id: number;
  codigo_reserva: string;
  usuario_id: number;
  fecha_reserva: string;
  estado: string;
  total: number;
  detalles: DetalleReservaInfo[];
}

export interface DetalleReservaInfo {
  id: number;
  pasajero_nombre: string;
  pasajero_apellido: string;
  clase: string;
  precio: number;
  instancia_vuelo_id: number;
  asiento_id?: number;
}

export interface TarjetaCredito {
  id?: number;
  numero_tarjeta: string;
  nombre_titular: string;
  fecha_expiracion: string;
  cvv: string;
  tipo: string;
}

export interface Pago {
  id: number;
  reserva_id: number;
  monto: number;
  fecha_pago: string;
  estado: string;
  numero_autorizacion?: string;
}

export interface Billete {
  id: number;
  codigo_billete: string;
  fecha_emision: string;
  metodo_entrega: string;
  estado: string;
  pasajero?: string;
  detalle_reserva_id: number;
  check_in_realizado?: boolean;
}

export interface LoginData {
  username: string; // Email
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}
