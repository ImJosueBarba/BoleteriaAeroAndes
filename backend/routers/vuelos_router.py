from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import date, datetime, timedelta, time

from database import get_db
from models import Vuelo, Ciudad, Aerolinea, InstanciaVuelo, Tarifa
from schemas import (
    BusquedaVuelosRequest,
    VueloDisponible,
    CiudadResponse,
    AerolineaResponse
)

router = APIRouter(prefix="/vuelos", tags=["Vuelos"])

@router.get("/ciudades", response_model=List[CiudadResponse])
def listar_ciudades(db: Session = Depends(get_db)):
    """Obtener lista de todas las ciudades disponibles"""
    ciudades = db.query(Ciudad).all()
    return ciudades

@router.get("/aerolineas", response_model=List[AerolineaResponse])
def listar_aerolineas(db: Session = Depends(get_db)):
    """Obtener lista de todas las aerolíneas activas"""
    aerolineas = db.query(Aerolinea).filter(Aerolinea.activa == True).all()
    return aerolineas

@router.post("/buscar/horarios", response_model=List[VueloDisponible])
def buscar_vuelos_por_horarios(
    busqueda: BusquedaVuelosRequest,
    db: Session = Depends(get_db)
):
    """Buscar vuelos por horarios entre dos ciudades"""
    # DEBUG: Ver qué está llegando
    print(f"\n{'='*60}")
    print(f"🔍 BÚSQUEDA RECIBIDA:")
    print(f"   Origen: {busqueda.origen}")
    print(f"   Destino: {busqueda.destino}")
    print(f"   Fecha: {busqueda.fecha} (tipo: {type(busqueda.fecha)})")
    print(f"   Clase: {busqueda.clase}")
    print(f"   Día de semana: {busqueda.fecha.weekday()} (0=Lunes, 6=Domingo)")
    print(f"{'='*60}\n")
    
    # Obtener ciudades
    ciudad_origen = db.query(Ciudad).filter(Ciudad.codigo_iata == busqueda.origen).first()
    ciudad_destino = db.query(Ciudad).filter(Ciudad.codigo_iata == busqueda.destino).first()
    
    print(f"🏙️ Ciudad origen: {ciudad_origen.nombre if ciudad_origen else 'NO ENCONTRADA'}")
    print(f"🏙️ Ciudad destino: {ciudad_destino.nombre if ciudad_destino else 'NO ENCONTRADA'}\n")
    
    if not ciudad_origen or not ciudad_destino:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ciudad no encontrada"
        )
    
    # Normalizar clase a mayúsculas
    clase_normalizada = busqueda.clase.upper() if busqueda.clase else "ECONOMICA"
    print(f"✈️ Clase normalizada: '{busqueda.clase}' → '{clase_normalizada}'\n")
    
    # Determinar día de la semana (0=Lunes, 6=Domingo)
    dia_semana = busqueda.fecha.weekday()
    
    # Construir query base
    query = db.query(Vuelo, Tarifa, InstanciaVuelo).join(
        Tarifa, Vuelo.id == Tarifa.vuelo_id
    ).outerjoin(
        InstanciaVuelo,
        and_(
            InstanciaVuelo.vuelo_id == Vuelo.id,
            InstanciaVuelo.fecha == busqueda.fecha
        )
    ).filter(
        Vuelo.ciudad_origen_id == ciudad_origen.id,
        Vuelo.ciudad_destino_id == ciudad_destino.id,
        Vuelo.activo == True,
        Tarifa.clase == clase_normalizada,
        Tarifa.fecha_inicio <= busqueda.fecha,
        or_(Tarifa.fecha_fin >= busqueda.fecha, Tarifa.fecha_fin == None)
    )
    
    # Filtrar por aerolínea si se especifica
    if busqueda.aerolinea_codigo:
        query = query.join(Aerolinea).filter(Aerolinea.codigo_iata == busqueda.aerolinea_codigo)
    
    resultados = query.all()
    
    print(f"📊 Resultados de la query inicial: {len(resultados)} registros\n")
    
    # Obtener hora actual para filtrar vuelos si es para hoy
    hora_actual = datetime.now().time()
    es_hoy = busqueda.fecha == date.today()
    margen_minutos = 30  # Minutos mínimos antes del vuelo para poder reservar
    
    print(f"⏰ Es para hoy: {es_hoy}")
    if es_hoy:
        print(f"⏰ Hora actual: {hora_actual}")
        print(f"⏰ Margen de minutos: {margen_minutos}\n")
    
    # Filtrar por día de operación y formatear resultados
    vuelos_disponibles = []
    vuelos_filtrados_por_dia = 0
    vuelos_filtrados_por_hora = 0
    
    for vuelo, tarifa, instancia in resultados:
        # Verificar si el vuelo opera ese día
        if vuelo.dias_operacion[dia_semana] == '0':
            vuelos_filtrados_por_dia += 1
            continue
        
        # Si es para hoy, verificar que el vuelo aún no haya salido
        if es_hoy:
            # Convertir hora de salida del vuelo a datetime para comparación
            hora_salida = vuelo.hora_salida
            if isinstance(hora_salida, str):
                hora_salida = datetime.strptime(hora_salida, "%H:%M").time()
            
            # Calcular hora límite de reserva (hora_salida - margen_minutos)
            hora_salida_dt = datetime.combine(date.today(), hora_salida)
            hora_limite_reserva = (hora_salida_dt - timedelta(minutes=margen_minutos)).time()
            
            # Si ya pasó la hora límite, no mostrar este vuelo
            if hora_actual > hora_limite_reserva:
                vuelos_filtrados_por_hora += 1
                continue
        
        # Determinar asientos disponibles
        if instancia:
            if clase_normalizada == "ECONOMICA":
                asientos_disp = instancia.asientos_disponibles_economica
            elif clase_normalizada == "EJECUTIVA":
                asientos_disp = instancia.asientos_disponibles_ejecutiva
            else:
                asientos_disp = instancia.asientos_disponibles_primera
        else:
            # Valores por defecto si no hay instancia creada
            asientos_disp = 150 if clase_normalizada == "ECONOMICA" else 30
        
        vuelos_disponibles.append(VueloDisponible(
            vuelo_id=vuelo.id,
            instancia_vuelo_id=instancia.id if instancia else None,
            numero_vuelo=vuelo.numero_vuelo,
            aerolinea=vuelo.aerolinea.nombre,
            origen=f"{ciudad_origen.nombre} ({ciudad_origen.codigo_iata})",
            destino=f"{ciudad_destino.nombre} ({ciudad_destino.codigo_iata})",
            fecha=busqueda.fecha,
            hora_salida=str(vuelo.hora_salida),
            hora_llegada=str(vuelo.hora_llegada),
            duracion_minutos=vuelo.duracion_minutos,
            clase=clase_normalizada,
            precio=tarifa.precio,
            asientos_disponibles=asientos_disp
        ))
    
    # Ordenar por hora de salida
    vuelos_disponibles.sort(key=lambda x: x.hora_salida)
    
    # Filtrar por horario de salida si se especifica
    vuelos_filtrados_horario = 0
    if busqueda.horario_salida and busqueda.horario_salida != 'all':
        vuelos_temp = []
        for v in vuelos_disponibles:
            hora_parts = v.hora_salida.split(':')
            hora = int(hora_parts[0])
            
            incluir = False
            if busqueda.horario_salida == 'morning' and 6 <= hora < 12:
                incluir = True
            elif busqueda.horario_salida == 'afternoon' and 12 <= hora < 18:
                incluir = True
            elif busqueda.horario_salida == 'evening' and (18 <= hora or hora < 6):
                incluir = True
            
            if incluir:
                vuelos_temp.append(v)
            else:
                vuelos_filtrados_horario += 1
        
        vuelos_disponibles = vuelos_temp
    
    # Filtrar por precio máximo si se especifica
    vuelos_filtrados_precio = 0
    if busqueda.precio_maximo:
        vuelos_temp = []
        for v in vuelos_disponibles:
            if float(v.precio) <= busqueda.precio_maximo:
                vuelos_temp.append(v)
            else:
                vuelos_filtrados_precio += 1
        
        vuelos_disponibles = vuelos_temp
    
    print(f"📈 RESUMEN:")
    print(f"   Query inicial: {len(resultados)} resultados")
    print(f"   Filtrados por día: {vuelos_filtrados_por_dia}")
    print(f"   Filtrados por hora reserva: {vuelos_filtrados_por_hora}")
    print(f"   Filtrados por horario salida: {vuelos_filtrados_horario}")
    print(f"   Filtrados por precio: {vuelos_filtrados_precio}")
    print(f"   ✅ Vuelos disponibles finales: {len(vuelos_disponibles)}")
    print(f"{'='*60}\n")
    
    return vuelos_disponibles

@router.post("/buscar/tarifas", response_model=List[VueloDisponible])
def buscar_vuelos_por_tarifas(
    busqueda: BusquedaVuelosRequest,
    db: Session = Depends(get_db)
):
    """Buscar vuelos ordenados por precio (tarifa) entre dos ciudades"""
    vuelos = buscar_vuelos_por_horarios(busqueda, db)
    
    # Ordenar por precio
    vuelos.sort(key=lambda x: x.precio)
    
    return vuelos

@router.get("/informacion/{numero_vuelo}")
def obtener_informacion_vuelo(
    numero_vuelo: str,
    fecha: Optional[date] = Query(None, description="Fecha del vuelo (para ver estado actual)"),
    db: Session = Depends(get_db)
):
    """Obtener información detallada de un vuelo específico"""
    vuelo = db.query(Vuelo).filter(Vuelo.numero_vuelo == numero_vuelo).first()
    
    if not vuelo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vuelo no encontrado"
        )
    
    response = {
        "vuelo": {
            "numero_vuelo": vuelo.numero_vuelo,
            "aerolinea": vuelo.aerolinea.nombre,
            "origen": f"{vuelo.ciudad_origen.nombre} ({vuelo.ciudad_origen.codigo_iata})",
            "destino": f"{vuelo.ciudad_destino.nombre} ({vuelo.ciudad_destino.codigo_iata})",
            "hora_salida": str(vuelo.hora_salida),
            "hora_llegada": str(vuelo.hora_llegada),
            "duracion_minutos": vuelo.duracion_minutos,
            "activo": vuelo.activo
        },
        "tarifas": []
    }
    
    # Obtener tarifas
    for tarifa in vuelo.tarifas:
        response["tarifas"].append({
            "clase": tarifa.clase,
            "precio": float(tarifa.precio),
            "moneda": tarifa.moneda
        })
    
    # Si se especifica fecha, obtener estado del vuelo
    if fecha:
        instancia = db.query(InstanciaVuelo).filter(
            InstanciaVuelo.vuelo_id == vuelo.id,
            InstanciaVuelo.fecha == fecha
        ).first()
        
        if instancia:
            response["estado_vuelo"] = {
                "fecha": str(instancia.fecha),
                "estado": instancia.estado,
                "puerta": instancia.puerta,
                "asientos_disponibles": {
                    "economica": instancia.asientos_disponibles_economica,
                    "ejecutiva": instancia.asientos_disponibles_ejecutiva,
                    "primera_clase": instancia.asientos_disponibles_primera
                }
            }
            
            # Si es para hoy, mostrar si está en hora
            if fecha == date.today():
                response["estado_vuelo"]["en_hora"] = instancia.estado == "EN_HORA"
        else:
            response["estado_vuelo"] = {
                "mensaje": "No hay información disponible para esta fecha"
            }
    
    return response

@router.get("/asientos/{vuelo_id}/{fecha}")
def obtener_mapa_asientos(
    vuelo_id: int,
    fecha: date,
    clase: Optional[str] = Query(None, description="Filtrar por clase: ECONOMICA, EJECUTIVA, PRIMERA"),
    db: Session = Depends(get_db)
):
    """Obtener mapa de asientos disponibles para un vuelo en una fecha específica"""
    from models import Asiento, DetalleReserva, Reserva
    
    # Verificar que el vuelo existe y cargar las relaciones necesarias
    vuelo = db.query(Vuelo).options(
        joinedload(Vuelo.ciudad_origen),
        joinedload(Vuelo.ciudad_destino)
    ).filter(Vuelo.id == vuelo_id).first()
    
    if not vuelo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vuelo no encontrado"
        )
    
    # Buscar la instancia del vuelo para esa fecha
    instancia = db.query(InstanciaVuelo).filter(
        InstanciaVuelo.vuelo_id == vuelo_id,
        InstanciaVuelo.fecha == fecha
    ).first()
    
    if not instancia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay vuelos programados para esta fecha"
        )
    
    # Obtener todos los asientos del vuelo
    asientos = db.query(Asiento).filter(Asiento.vuelo_id == vuelo_id).order_by(
        Asiento.numero_asiento
    ).all()
    
    # Obtener capacidades configuradas en la instancia
    cap_primera = instancia.asientos_disponibles_primera if instancia.asientos_disponibles_primera else 0
    cap_ejecutiva = instancia.asientos_disponibles_ejecutiva if instancia.asientos_disponibles_ejecutiva else 30
    cap_economica = instancia.asientos_disponibles_economica if instancia.asientos_disponibles_economica else 120
    
    # Calcular asientos existentes por clase
    if asientos:
        asientos_por_clase = {
            'PRIMERA': len([a for a in asientos if a.clase == 'PRIMERA']),
            'EJECUTIVA': len([a for a in asientos if a.clase == 'EJECUTIVA']),
            'ECONOMICA': len([a for a in asientos if a.clase == 'ECONOMICA'])
        }
        
        # Verificar si coinciden con la configuración de la instancia
        if (asientos_por_clase['PRIMERA'] != cap_primera or 
            asientos_por_clase['EJECUTIVA'] != cap_ejecutiva or 
            asientos_por_clase['ECONOMICA'] != cap_economica):
            
            print(f"⚠️ Capacidad no coincide para vuelo {vuelo_id}.")
            print(f"   Existente - P:{asientos_por_clase['PRIMERA']} E:{asientos_por_clase['EJECUTIVA']} Ec:{asientos_por_clase['ECONOMICA']}")
            print(f"   Esperado  - P:{cap_primera} E:{cap_ejecutiva} Ec:{cap_economica}")
            
            # Primero, liberar asientos de reservas canceladas
            from models import DetalleReserva, Reserva
            
            # Encontrar detalles de reservas canceladas que tienen asientos asignados
            detalles_cancelados = db.query(DetalleReserva).join(
                Reserva
            ).filter(
                Reserva.estado == "CANCELADA",
                DetalleReserva.asiento_id.isnot(None)
            ).all()
            
            # Liberar esos asientos
            for detalle in detalles_cancelados:
                detalle.asiento_id = None
            
            db.commit()
            print(f"   🔓 Liberados asientos de {len(detalles_cancelados)} reservas canceladas")
            
            # Ahora eliminar asientos que NO están asignados a reservas activas
            asientos_sin_usar = db.query(Asiento).filter(
                Asiento.vuelo_id == vuelo_id,
                Asiento.disponible == True
            ).all()
            
            # Borrar solo los asientos sin usar
            for asiento in asientos_sin_usar:
                db.delete(asiento)
            
            db.commit()
            print(f"   ✅ Eliminados {len(asientos_sin_usar)} asientos disponibles")
            
            # Recargar asientos actuales
            asientos = db.query(Asiento).filter(Asiento.vuelo_id == vuelo_id).all()
    
    # Verificar cuántos asientos faltan por crear
    asientos_por_clase_actuales = {
        'PRIMERA': len([a for a in asientos if a.clase == 'PRIMERA']),
        'EJECUTIVA': len([a for a in asientos if a.clase == 'EJECUTIVA']),
        'ECONOMICA': len([a for a in asientos if a.clase == 'ECONOMICA'])
    }
    
    asientos_faltantes = {
        'PRIMERA': cap_primera - asientos_por_clase_actuales['PRIMERA'],
        'EJECUTIVA': cap_ejecutiva - asientos_por_clase_actuales['EJECUTIVA'],
        'ECONOMICA': cap_economica - asientos_por_clase_actuales['ECONOMICA']
    }
    
    # Si faltan asientos, generarlos
    if any(cant > 0 for cant in asientos_faltantes.values()):
        print(f"🔧 Generando asientos faltantes para vuelo {vuelo_id}...")
        print(f"   Faltan - P:{asientos_faltantes['PRIMERA']} E:{asientos_faltantes['EJECUTIVA']} Ec:{asientos_faltantes['ECONOMICA']}")
        
        asientos_a_crear = []
        letras = ['A', 'B', 'C', 'D', 'E', 'F']
        
        # Obtener el número de fila más alto existente
        numeros_existentes = [a.numero_asiento for a in asientos]
        fila_actual = 1
        if numeros_existentes:
            # Extraer números de fila de los asientos existentes
            filas_existentes = []
            for num in numeros_existentes:
                try:
                    fila = int(''.join(filter(str.isdigit, num)))
                    filas_existentes.append(fila)
                except:
                    pass
            if filas_existentes:
                fila_actual = max(filas_existentes) + 1
        
        # Primera Clase
        asientos_primera_necesarios = asientos_faltantes['PRIMERA']
        while asientos_primera_necesarios > 0:
            for letra in letras:
                if asientos_primera_necesarios <= 0:
                    break
                asientos_a_crear.append(
                    Asiento(
                        vuelo_id=vuelo_id,
                        numero_asiento=f"{fila_actual}{letra}",
                        clase="PRIMERA"
                    )
                )
                asientos_primera_necesarios -= 1
            fila_actual += 1
        
        # Ejecutiva
        asientos_ejecutiva_necesarios = asientos_faltantes['EJECUTIVA']
        while asientos_ejecutiva_necesarios > 0:
            for letra in letras:
                if asientos_ejecutiva_necesarios <= 0:
                    break
                asientos_a_crear.append(
                    Asiento(
                        vuelo_id=vuelo_id,
                        numero_asiento=f"{fila_actual}{letra}",
                        clase="EJECUTIVA"
                    )
                )
                asientos_ejecutiva_necesarios -= 1
            fila_actual += 1
        
        # Económica
        asientos_economica_necesarios = asientos_faltantes['ECONOMICA']
        while asientos_economica_necesarios > 0:
            for letra in letras:
                if asientos_economica_necesarios <= 0:
                    break
                asientos_a_crear.append(
                    Asiento(
                        vuelo_id=vuelo_id,
                        numero_asiento=f"{fila_actual}{letra}",
                        clase="ECONOMICA"
                    )
                )
                asientos_economica_necesarios -= 1
            fila_actual += 1
        
        # Insertar todos los asientos faltantes
        if asientos_a_crear:
            db.add_all(asientos_a_crear)
            db.commit()
            print(f"✅ Creados {len(asientos_a_crear)} asientos faltantes")
        
        # Recargar asientos
        asientos = db.query(Asiento).filter(Asiento.vuelo_id == vuelo_id).order_by(
            Asiento.numero_asiento
        ).all()
    
    # Obtener asientos ocupados (reservados y pagados para esta fecha)
    asientos_ocupados = db.query(Asiento.numero_asiento).join(
        DetalleReserva, DetalleReserva.asiento_id == Asiento.id
    ).join(
        Reserva, Reserva.id == DetalleReserva.reserva_id
    ).filter(
        Asiento.vuelo_id == vuelo_id,
        DetalleReserva.instancia_vuelo_id == instancia.id,
        or_(Reserva.estado == "CONFIRMADA", Reserva.estado == "PAGADA")
    ).all()
    
    asientos_ocupados_set = {a[0] for a in asientos_ocupados}
    
    # Normalizar clase si se proporciona
    clase_filtro = None
    if clase:
        clase_normalizada = clase.upper().strip().replace('_', ' ').replace('-', ' ')
        # Mapear variantes de nombre
        if clase_normalizada in ["ECONOMICA", "ECONÓMICA", "ECONOMY", "ECONOMÍA"]:
            clase_filtro = "ECONOMICA"
        elif clase_normalizada in ["EJECUTIVA", "BUSINESS", "BUSSINESS", "CLASE EJECUTIVA"]:
            clase_filtro = "EJECUTIVA"
        elif clase_normalizada in ["PRIMERA", "PRIMERA CLASE", "PRIMERACLASE", "FIRST", "FIRST CLASS"]:
            clase_filtro = "PRIMERA"
    
    # Construir mapa de asientos (filtrado por clase si se especifica)
    mapa_asientos = []
    for asiento in asientos:
        # Si hay filtro de clase, solo incluir asientos de esa clase
        if clase_filtro and asiento.clase != clase_filtro:
            continue
            
        mapa_asientos.append({
            "numero_asiento": asiento.numero_asiento,
            "clase": asiento.clase,
            "disponible": asiento.numero_asiento not in asientos_ocupados_set
        })
    
    # Obtener las ciudades para origen y destino
    origen = vuelo.ciudad_origen.codigo_iata if vuelo.ciudad_origen else "N/A"
    destino = vuelo.ciudad_destino.codigo_iata if vuelo.ciudad_destino else "N/A"
    
    return {
        "vuelo": {
            "id": vuelo.id,
            "numero_vuelo": vuelo.numero_vuelo,
            "origen": origen,
            "destino": destino,
            "fecha": str(fecha)
        },
        "asientos": mapa_asientos,
        "resumen": {
            "total": len(asientos),
            "disponibles": len([a for a in mapa_asientos if a["disponible"]]),
            "ocupados": len(asientos_ocupados_set)
        }
    }

