from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

from routers import auth_router, vuelos_router, reservas_router, pagos_router, notificaciones_router

load_dotenv()

app = FastAPI(
    title="Sistema de Reserva de Vuelos - Boletería JB",
    description="API REST para gestión de reservas y compra de billetes aéreos",
    version="1.0.0"
)

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # URLs del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth_router.router)
app.include_router(vuelos_router.router)
app.include_router(reservas_router.router)
app.include_router(pagos_router.router)
app.include_router(notificaciones_router.router)

@app.get("/")
def read_root():
    """Endpoint raíz con información de la API"""
    return {
        "mensaje": "Bienvenido al Sistema de Reserva de Vuelos - Boletería JB",
        "version": "1.0.0",
        "documentacion": "/docs",
        "servicios": [
            "Registro y autenticación de usuarios",
            "Consulta de vuelos por horarios, tarifas e información",
            "Reserva de vuelos para múltiples pasajeros",
            "Compra de billetes con tarjeta de crédito"
        ]
    }

@app.get("/health")
def health_check():
    """Verificar estado de la API"""
    return {"status": "ok"}

if __name__ == "__main__":
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True
    )
