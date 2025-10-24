import api from './axios';
import {
  LoginData,
  RegisterData,
  AuthToken,
  Usuario,
  Ciudad,
  Aerolinea,
  BusquedaVuelos,
  VueloDisponible,
  ReservaCreate,
  Reserva,
  TarjetaCredito,
  Pago,
  Billete,
} from '../types';

// Autenticación
export const authAPI = {
  registro: (data: RegisterData) => api.post<Usuario>('/auth/registro', data),
  
  login: (data: LoginData) => {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);
    return api.post<AuthToken>('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  getPerfil: () => api.get<Usuario>('/auth/perfil'),
  
  actualizarPerfil: (data: Partial<Usuario>) => 
    api.put<Usuario>('/auth/perfil', null, { params: data }),
  
  cambiarPassword: (passwordActual: string, passwordNueva: string) =>
    api.put('/auth/cambiar-password', null, { 
      params: { password_actual: passwordActual, password_nueva: passwordNueva } 
    }),
  
  eliminarCuenta: () => api.delete('/auth/perfil'),
  
  solicitarRecuperacionPassword: (email: string) =>
    api.post('/auth/solicitar-recuperacion-password', null, { params: { email } }),
  
  recuperarPassword: (token: string, nuevaPassword: string) =>
    api.post('/auth/recuperar-password', null, { 
      params: { token, nueva_password: nuevaPassword } 
    }),
};

// Vuelos
export const vuelosAPI = {
  getCiudades: () => api.get<Ciudad[]>('/vuelos/ciudades'),
  
  getAerolineas: () => api.get<Aerolinea[]>('/vuelos/aerolineas'),
  
  buscarPorHorarios: (data: BusquedaVuelos) =>
    api.post<VueloDisponible[]>('/vuelos/buscar/horarios', data),
  
  buscarPorTarifas: (data: BusquedaVuelos) =>
    api.post<VueloDisponible[]>('/vuelos/buscar/tarifas', data),
  
  getInformacionVuelo: (numeroVuelo: string, fecha?: string) =>
    api.get(`/vuelos/informacion/${numeroVuelo}`, {
      params: fecha ? { fecha } : {},
    }),
  
  obtenerMapaAsientos: (vueloId: number, fecha: string, clase?: string) =>
    api.get(`/vuelos/asientos/${vueloId}/${fecha}`, {
      params: clase ? { clase } : {},
    }),
};

// Reservas
export const reservasAPI = {
  crear: (data: ReservaCreate) => api.post<Reserva>('/reservas/', data),
  
  listar: () => api.get<Reserva[]>('/reservas/'),
  
  obtener: (codigoReserva: string) => api.get<Reserva>(`/reservas/${codigoReserva}`),
  
  cancelar: (codigoReserva: string) => api.delete(`/reservas/${codigoReserva}`),
  
  hacerCheckIn: (codigoBillete: string) => 
    api.post(`/reservas/check-in/${codigoBillete}`),
};

// Pagos y Billetes
export const pagosAPI = {
  agregarTarjeta: (data: TarjetaCredito) =>
    api.post<TarjetaCredito>('/pagos/tarjetas', data),
  
  listarTarjetas: () => api.get<TarjetaCredito[]>('/pagos/tarjetas'),
  
  eliminarTarjeta: (tarjetaId: number) => api.delete(`/pagos/tarjetas/${tarjetaId}`),
  
  procesarPago: (data: { reserva_id: number; tarjeta_id: number; metodo_entrega: string }) =>
    api.post<Pago>('/pagos/procesar', data),
  
  historialPagos: () => api.get<Pago[]>('/pagos/historial'),
  
  listarBilletes: () => api.get<Billete[]>('/pagos/billetes'),
  
  obtenerBillete: (codigoBillete: string) =>
    api.get(`/pagos/billetes/${codigoBillete}`),
};

// Notificaciones
export const notificacionesAPI = {
  listar: (soloNoLeidas: boolean = false, limite: number = 50) =>
    api.get('/notificaciones/', { params: { solo_no_leidas: soloNoLeidas, limite } }),
  
  contador: () => api.get('/notificaciones/contador'),
  
  marcarLeida: (notificacionId: number) =>
    api.patch(`/notificaciones/${notificacionId}/marcar-leida`),
  
  marcarTodasLeidas: () =>
    api.patch('/notificaciones/marcar-todas-leidas'),
  
  eliminar: (notificacionId: number) =>
    api.delete(`/notificaciones/${notificacionId}`),
};
