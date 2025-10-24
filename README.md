# BoleteriaAeroAndes
Sistema de gestión de vuelos y reservas desarrollado con Vite, TypeScript y Python, que permite administrar aerolíneas, vuelos y pasajeros de forma eficiente.

## 📋 Características

- ✅ Registro e inicio de sesión de usuarios (JWT)
- ✅ Búsqueda de vuelos por horarios y tarifas
- ✅ Reservas de vuelos para múltiples pasajeros
- ✅ Procesamiento de pagos con tarjetas
- ✅ Generación de billetes electrónicos
- ✅ Gestión de perfil de usuario

## 🛠️ Tecnologías

### Backend
- **Python** 3.11+
- **FastAPI** 0.104.1
- **SQLAlchemy** 2.0.23
- **PostgreSQL** 14+
- **JWT** (python-jose)
- **Bcrypt** (passlib)

### Frontend
- **Vite** 5.0.8
- **TypeScript** 5.2.2
- **Vanilla JavaScript** (sin frameworks)
- **Axios** 1.6.2

- ### 2. Configurar Backend

```powershell
# Ir al directorio del backend
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
.\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno (.env)
# Editar backend/.env con tus credenciales de PostgreSQL
```
Archivo `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:tu_password@localhost/boleteria_vuelos
SECRET_KEY=tu_clave_secreta_muy_segura_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 3. Configurar Frontend

```powershell
# Ir al directorio del frontend
cd frontend

# Instalar dependencias
npm install
```

### 4. Ejecutar la Aplicación

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

El backend estará en: `http://localhost:8000`
Documentación API: `http://localhost:8000/docs`

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

El frontend estará en: `http://localhost:5173`
## 📚 API Endpoints

### Autenticación
- `POST /auth/registro` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión (obtener token JWT)
- `GET /auth/perfil` - Obtener perfil del usuario
- `PUT /auth/perfil` - Actualizar perfil
- `DELETE /auth/perfil` - Eliminar cuenta

### Vuelos
- `GET /vuelos/ciudades` - Listar ciudades disponibles
- `GET /vuelos/aerolineas` - Listar aerolíneas
- `POST /vuelos/buscar/horarios` - Buscar vuelos por horario
- `POST /vuelos/buscar/tarifas` - Buscar vuelos por tarifa
- `GET /vuelos/informacion/{numero_vuelo}` - Información detallada de vuelo

### Reservas
- `POST /reservas/` - Crear nueva reserva
- `GET /reservas/` - Listar reservas del usuario
- `GET /reservas/{codigo}` - Obtener detalles de reserva
- `DELETE /reservas/{codigo}` - Cancelar reserva

### Pagos
- `POST /pagos/tarjetas` - Agregar tarjeta de crédito
- `GET /pagos/tarjetas` - Listar tarjetas del usuario
- `POST /pagos/procesar` - Procesar pago y generar billetes
- `GET /pagos/billetes` - Listar billetes del usuario
- `GET /pagos/billetes/{codigo}` - Obtener detalles de billete

## 🗄️ Base de Datos

El sistema utiliza las siguientes tablas:

- `usuarios` - Información de usuarios
- `tarjetas_credito` - Tarjetas de pago
- `ciudades` - Ciudades con aeropuertos
- `aerolineas` - Compañías aéreas
- `vuelos` - Rutas de vuelo
- `tarifas` - Precios por clase
- `instancias_vuelo` - Vuelos programados
- `asientos` - Asientos en vuelos
- `reservas` - Reservas de usuarios
- `detalles_reserva` - Detalles de pasajeros
- `billetes` - Billetes emitidos
- `pagos` - Transacciones de pago

## 🔐 Seguridad

- Contraseñas hasheadas con **bcrypt**
- Autenticación mediante **JWT tokens**
- Validación de datos con **Pydantic**
- CORS configurado para desarrollo local
- Variables sensibles en archivo `.env`

## 💳 Datos de Prueba

El archivo `database/seed_data.sql` incluye:
- 10 ciudades internacionales
- 8 aerolíneas
- 10+ vuelos de ejemplo
- Múltiples tarifas por vuelo


