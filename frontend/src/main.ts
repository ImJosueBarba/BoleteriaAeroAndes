import './style.css';
import { authAPI, vuelosAPI, reservasAPI, pagosAPI, notificacionesAPI } from './api';
import type { Usuario, VueloDisponible, Reserva, Billete, Ciudad } from './types';

// Sistema de notificaciones
class NotificationManager {
  private container: HTMLDivElement | null = null;

  constructor() {
    this.createContainer();
  }

  private createContainer() {
    // Verificar si ya existe un contenedor en el DOM
    const existing = document.getElementById('notification-container');
    if (existing) {
      this.container = existing as HTMLDivElement;
      return;
    }
    
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
    
    // Esperar a que el body esté disponible
    if (document.body) {
      document.body.appendChild(this.container);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(this.container!);
      });
    }
  }

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 4000) {
    // Verificar que el contenedor existe en el DOM, si no recrearlo
    if (!this.container || !document.body.contains(this.container)) {
      this.createContainer();
    }
    
    if (!this.container) {
      console.error('Failed to create notification container!');
      return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
    
    notification.innerHTML = `
      <span class="notification-icon">${icon}</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close">×</button>
    `;

    this.container.appendChild(notification);

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn?.addEventListener('click', () => this.hide(notification));

    setTimeout(() => this.hide(notification), duration);
  }

  private hide(notification: HTMLElement) {
    notification.classList.add('hiding');
    setTimeout(() => notification.remove(), 300);
  }
}

const notify = new NotificationManager();

// Utilidades de validación
class Validator {
  static email(email: string): { valid: boolean; message: string } {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return { valid: false, message: 'El email es requerido' };
    if (!regex.test(email)) return { valid: false, message: 'Formato de email inválido' };
    return { valid: true, message: '' };
  }

  static password(password: string): { valid: boolean; message: string } {
    if (!password) return { valid: false, message: 'La contraseña es requerida' };
    if (password.length < 6) return { valid: false, message: 'Mínimo 6 caracteres' };
    // Validar longitud máxima (bcrypt tiene límite de 72 bytes)
    const passwordBytes = new TextEncoder().encode(password).length;
    if (passwordBytes > 72) return { valid: false, message: 'Máximo 72 caracteres' };
    return { valid: true, message: '' };
  }

  static name(name: string): { valid: boolean; message: string } {
    if (!name) return { valid: false, message: 'Este campo es requerido' };
    if (name.trim().length < 2) return { valid: false, message: 'Mínimo 2 caracteres' };
    return { valid: true, message: '' };
  }

  static phone(phone: string): { valid: boolean; message: string } {
    if (!phone) return { valid: true, message: '' }; // Opcional
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return { valid: false, message: 'Mínimo 10 dígitos' };
    return { valid: true, message: '' };
  }
}

// Sistema de modales de confirmación
class ConfirmModal {
  static show(options: {
    title: string;
    message: string;
    details?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel?: () => void;
  }): void {
    const {
      title,
      message,
      details,
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      type = 'danger',
      onConfirm,
      onCancel
    } = options;

    const typeColors = {
      danger: { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', icon: '⚠️' },
      warning: { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: '⚠️' },
      info: { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', icon: 'ℹ️' }
    };

    const currentType = typeColors[type];

    const modalHtml = `
      <div class="modal-overlay confirm-modal" id="confirm-modal">
        <div class="modal-content">
          <div class="modal-header" style="background: ${currentType.bg};">
            <h3>
              <span style="font-size: 24px; margin-right: 8px;">${currentType.icon}</span>
              ${title}
            </h3>
          </div>
          <div class="modal-body">
            <p class="confirm-message">${message}</p>
            ${details ? `
              <div class="confirm-details">
                <strong>⚠️ Atención:</strong><br/>
                ${details}
              </div>
            ` : ''}
          </div>
          <div class="modal-footer">
            <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">
              ${cancelText}
            </button>
            <button class="modal-btn modal-btn-confirm" id="modal-confirm-btn">
              ${confirmText}
            </button>
          </div>
        </div>
      </div>
    `;

    // Insertar modal en el DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('confirm-modal');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    // Event listener para confirmar
    confirmBtn?.addEventListener('click', () => {
      onConfirm();
      modal?.remove();
    });

    // Event listener para cancelar
    cancelBtn?.addEventListener('click', () => {
      if (onCancel) onCancel();
      modal?.remove();
    });

    // Cerrar al hacer clic fuera del modal
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (onCancel) onCancel();
        modal.remove();
      }
    });

    // Cerrar con tecla ESC
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        modal?.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }
}

// Estado global de la aplicación
class AppState {
  currentUser: Usuario | null = null;
  currentView: string = 'home';
  selectedFlight: VueloDisponible | null = null;
  numPasajeros: string = '1';
  vueloIdaSeleccionado: VueloDisponible | null = null;
  parametrosBusquedaOriginal: any = null;

  constructor() {
    this.loadUser();
  }

  loadUser() {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getPerfil()
        .then(response => {
          this.currentUser = response.data;
          this.render();
        })
        .catch(() => {
          localStorage.removeItem('token');
          this.render();
        });
    }
  }

  setUser(user: Usuario | null) {
    this.currentUser = user;
    this.render();
  }

  crearReservaIdaYVuelta(vueloIda: VueloDisponible, vueloVuelta: VueloDisponible) {
    // Crear un objeto combinado con ambos vuelos
    const reservaIdaYVuelta = {
      vuelos: [vueloIda, vueloVuelta],
      esIdaYVuelta: true
    };
    
    // Limpiar estado de ida y vuelta
    this.vueloIdaSeleccionado = null;
    this.parametrosBusquedaOriginal = null;
    
    // Navegar a la pantalla de reserva con ambos vuelos
    this.navigate('reservar', reservaIdaYVuelta);
  }

  navigate(view: string, data?: any) {
    this.currentView = view;
    if (data) {
      if (view === 'reservar') {
        this.selectedFlight = data;
      }
    }
    this.render();
    
    // Actualizar estado activo del navbar
    setTimeout(() => {
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-view') === view) {
          btn.classList.add('active');
        }
      });
    }, 0);
  }

  render() {
    const app = document.getElementById('app');
    if (!app) return;

    // Verificar rutas especiales con tokens
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token && window.location.pathname === '/verificar-email') {
      this.renderVerificarEmail(token);
      return;
    }

    if (token && window.location.pathname === '/recuperar-password') {
      this.renderRecuperarPassword(token);
      return;
    }

    if (!this.currentUser) {
      document.body.classList.remove('home-background');
      app.innerHTML = this.renderAuth();
      this.attachAuthEvents();
    } else {
      document.body.classList.add('home-background');
      app.innerHTML = this.renderApp();
      this.attachAppEvents();
    }
  }

  renderAuth() {
    return `
      <div class="auth-page">
        <div class="auth-container-modern">
          <!-- Lado Izquierdo - Branding -->
          <div class="auth-brand-side">
            <div class="brand-content">
              <div class="brand-logo">
                <div class="plane-icon">✈️</div>
              </div>
              <h1 class="brand-title">Boletería JB</h1>
              <p class="brand-subtitle">Tu próxima aventura comienza aquí</p>
              
              <div class="brand-features">
                <div class="feature-item">
                  <span class="feature-icon">🌍</span>
                  <span class="feature-text">Más de 50 destinos internacionales</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">💳</span>
                  <span class="feature-text">Pagos seguros y confiables</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">📱</span>
                  <span class="feature-text">Gestiona tus vuelos fácilmente</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">🎫</span>
                  <span class="feature-text">Billetes electrónicos al instante</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Lado Derecho - Formulario -->
          <div class="auth-form-side">
            <div class="form-container">
              <div class="auth-tabs-modern">
                <button class="auth-tab-modern active" data-tab="login">
                  <span>Iniciar Sesión</span>
                </button>
                <button class="auth-tab-modern" data-tab="registro">
                  <span>Registrarse</span>
                </button>
              </div>

              <div class="auth-forms">
                <!-- Formulario Login -->
                <form id="login-form" class="auth-form-modern">
                  <div class="welcome-text">
                    <h2>¡Bienvenido de nuevo!</h2>
                    <p>Ingresa tus credenciales para continuar</p>
                  </div>

                  <div class="form-group-modern">
                    <label class="form-label-modern">
                      <span class="label-icon">📧</span>
                      Correo Electrónico
                    </label>
                    <input type="email" name="email" id="login-email" required autocomplete="email" 
                           placeholder="tu@email.com" class="input-modern" />
                    <div class="field-error" id="login-email-error"></div>
                  </div>

                  <div class="form-group-modern">
                    <label class="form-label-modern">
                      <span class="label-icon">🔒</span>
                      Contraseña
                    </label>
                    <input type="password" name="password" id="login-password" required autocomplete="current-password" 
                           placeholder="••••••••" class="input-modern" />
                    <div class="field-error" id="login-password-error"></div>
                  </div>

                  <div class="form-footer">
                    <a href="#" id="forgot-password-link" class="link-modern">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>

                  <button type="submit" class="btn-modern btn-primary-modern">
                    <span>Iniciar Sesión</span>
                    <span class="btn-arrow">→</span>
                  </button>
                  
                  <div class="divider-modern">
                    <span>¿Problemas para acceder?</span>
                  </div>

                  <a href="#" id="resend-verification-link" class="link-secondary-modern">
                    <span>📧</span>
                    Reenviar email de verificación
                  </a>
                </form>

              <!-- Formulario Registro -->
              <form id="registro-form" class="auth-form-modern" style="display:none;">
                <div class="welcome-text">
                  <h2>Crea tu cuenta</h2>
                  <p>Únete y empieza a explorar el mundo</p>
                </div>

                <div class="form-row-modern">
                  <div class="form-group-modern">
                    <label class="form-label-modern">
                      <span class="label-icon">👤</span>
                      Nombre
                    </label>
                    <input type="text" name="nombre" id="reg-nombre" required autocomplete="given-name" 
                           placeholder="Juan" class="input-modern" />
                    <div class="field-error" id="reg-nombre-error"></div>
                  </div>
                  <div class="form-group-modern">
                    <label class="form-label-modern">
                      <span class="label-icon">👤</span>
                      Apellido
                    </label>
                    <input type="text" name="apellido" id="reg-apellido" required autocomplete="family-name" 
                           placeholder="Pérez" class="input-modern" />
                    <div class="field-error" id="reg-apellido-error"></div>
                  </div>
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">
                    <span class="label-icon">📧</span>
                    Correo Electrónico
                  </label>
                  <input type="email" name="email" id="reg-email" required autocomplete="email" 
                         placeholder="tu@email.com" class="input-modern" />
                  <div class="field-error" id="reg-email-error"></div>
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">
                    <span class="label-icon">🔒</span>
                    Contraseña
                    <span class="text-muted-modern">(mínimo 6 caracteres)</span>
                  </label>
                  <input type="password" name="password" id="reg-password" required autocomplete="new-password" 
                         placeholder="••••••••" class="input-modern" />
                  <div class="field-error" id="reg-password-error"></div>
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">
                    <span class="label-icon">📱</span>
                    Teléfono
                    <span class="text-muted-modern">(opcional)</span>
                  </label>
                  <input type="tel" name="telefono" id="reg-telefono" autocomplete="tel" 
                         placeholder="+593 123 456 7890" class="input-modern" />
                  <div class="field-error" id="reg-telefono-error"></div>
                </div>

                <button type="submit" class="btn-modern btn-success-modern">
                  <span>Crear Cuenta</span>
                  <span class="btn-arrow">→</span>
                </button>
              </form>
            </div>
          </div>

            <p class="auth-footer-modern">© 2025 Boletería JB. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    `;
  }

  renderVerificarEmail(token: string) {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="auth-page">
        <div class="auth-container">
          <div class="auth-header">
            <div class="auth-logo">
              <img src="/assets/icono.svg" alt="Boletería JB Logo" />
            </div>
            <h1>Boletería JB</h1>
            <p>Verificación de Email</p>
          </div>

          <div class="auth-card">
            <div id="verification-content" class="verification-container">
              <div class="loading-verification">
                <div class="spinner-large">⏳</div>
                <h3>Verificando tu email...</h3>
                <p>Por favor espera un momento</p>
              </div>
            </div>
          </div>

          <p class="auth-footer">© 2025 Boletería JB. Todos los derechos reservados.</p>
        </div>
      </div>
    `;

    // Verificar email con el backend
    this.verificarEmailToken(token);
  }

  async verificarEmailToken(token: string) {
    try {
      const response = await fetch(`http://localhost:8000/auth/verificar-email/${token}`);
      const data = await response.json();

      const container = document.getElementById('verification-content')!;

      if (response.ok) {
        container.innerHTML = `
          <div class="verification-success">
            <div class="success-icon-large">✅</div>
            <h2>¡Email Verificado!</h2>
            <p>${data.message}</p>
            <div class="verification-info">
              <p>Tu cuenta ha sido activada exitosamente.</p>
              <p><strong>Email:</strong> ${data.email}</p>
            </div>
            <button class="btn btn-primary btn-large" id="btn-ir-login">
              Iniciar Sesión →
            </button>
          </div>
        `;

        // Event listener para ir al login
        document.getElementById('btn-ir-login')?.addEventListener('click', () => {
          window.location.href = '/';
        });
      } else {
        container.innerHTML = `
          <div class="verification-error">
            <div class="error-icon-large">❌</div>
            <h2>Error de Verificación</h2>
            <p>${data.detail || 'No se pudo verificar tu email'}</p>
            <div class="verification-actions">
              <button class="btn btn-secondary" id="btn-reintentar">
                🔄 Solicitar Nuevo Email
              </button>
              <button class="btn btn-primary" id="btn-volver">
                ← Volver al Inicio
              </button>
            </div>
          </div>
        `;

        // Event listeners
        document.getElementById('btn-volver')?.addEventListener('click', () => {
          window.location.href = '/';
        });

        document.getElementById('btn-reintentar')?.addEventListener('click', () => {
          const email = prompt('Ingresa tu email para reenviar la verificación:');
          if (email) {
            this.reenviarVerificacion(email);
          }
        });
      }
    } catch (error) {
      const container = document.getElementById('verification-content')!;
      container.innerHTML = `
        <div class="verification-error">
          <div class="error-icon-large">⚠️</div>
          <h2>Error de Conexión</h2>
          <p>No se pudo conectar con el servidor. Por favor, intenta nuevamente.</p>
          <button class="btn btn-primary" id="btn-volver">
            ← Volver al Inicio
          </button>
        </div>
      `;

      document.getElementById('btn-volver')?.addEventListener('click', () => {
        window.location.href = '/';
      });
    }
  }

  async reenviarVerificacion(email: string) {
    try {
      const response = await fetch('http://localhost:8000/auth/reenviar-verificacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        notify.show('✉️ Email de verificación reenviado. Revisa tu bandeja de entrada.', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        const data = await response.json();
        notify.show(data.detail || 'Error al reenviar email', 'error');
      }
    } catch (error) {
      notify.show('Error de conexión. Intenta nuevamente.', 'error');
    }
  }

  renderRecuperarPassword(token: string) {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="auth-page">
        <div class="auth-container">
          <div class="auth-header">
            <div class="auth-logo">
              <img src="/assets/icono.svg" alt="Boletería JB Logo" />
            </div>
            <h1>Boletería JB</h1>
            <p>Recuperar Contraseña</p>
          </div>

          <div class="auth-card">
            <div class="auth-form">
              <h2 style="text-align: center; margin-bottom: 24px;">🔑 Nueva Contraseña</h2>
              <p style="text-align: center; color: #6b7280; margin-bottom: 24px;">
                Ingresa tu nueva contraseña para restablecer el acceso a tu cuenta.
              </p>
              
              <form id="reset-password-form">
                <input type="hidden" id="reset-token" value="${token}" />
                
                <div class="form-group">
                  <label>Nueva Contraseña <span class="text-muted">(mín. 6 caracteres)</span></label>
                  <input type="password" id="reset-password" required autocomplete="new-password" placeholder="••••••••" />
                  <div class="field-error" id="reset-password-error"></div>
                </div>

                <div class="form-group">
                  <label>Confirmar Contraseña</label>
                  <input type="password" id="reset-password-confirm" required autocomplete="new-password" placeholder="••••••••" />
                  <div class="field-error" id="reset-password-confirm-error"></div>
                </div>

                <button type="submit" class="btn btn-primary btn-large">
                  Restablecer Contraseña
                </button>
              </form>

              <div style="text-align: center; margin-top: 20px;">
                <a href="/" style="color: #3b82f6; text-decoration: none; font-size: 14px;">← Volver al inicio</a>
              </div>
            </div>
          </div>

          <p class="auth-footer">© 2025 Boletería JB. Todos los derechos reservados.</p>
        </div>
      </div>
    `;

    // Event listener para el formulario
    document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const password = (document.getElementById('reset-password') as HTMLInputElement).value;
      const passwordConfirm = (document.getElementById('reset-password-confirm') as HTMLInputElement).value;

      // Validar contraseña
      const passwordValidation = Validator.password(password);
      const passwordError = document.getElementById('reset-password-error');
      const confirmError = document.getElementById('reset-password-confirm-error');

      if (!passwordValidation.valid) {
        if (passwordError) {
          passwordError.textContent = passwordValidation.message;
          passwordError.classList.add('show');
        }
        return;
      } else {
        passwordError?.classList.remove('show');
      }

      // Validar que las contraseñas coincidan
      if (password !== passwordConfirm) {
        if (confirmError) {
          confirmError.textContent = 'Las contraseñas no coinciden';
          confirmError.classList.add('show');
        }
        return;
      } else {
        confirmError?.classList.remove('show');
      }

      // Enviar solicitud
      try {
        await authAPI.recuperarPassword(token, password);
        notify.show('✅ Contraseña actualizada exitosamente. Redirigiendo al login...', 'success', 3000);
        
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Error al restablecer la contraseña';
        notify.show(errorMessage, 'error');
      }
    });
  }

  renderApp() {
    const navbar = `
      <nav class="navbar">
        <div class="navbar-container">
          <div class="navbar-content">
            <button class="navbar-brand" data-view="home">
              <div class="navbar-logo">
                <img src="/assets/icono.svg" alt="Boletería JB" />
              </div>
              <div class="navbar-title">
                <span class="navbar-name">Boletería JB</span>
                <span class="navbar-subtitle">Sistema de Vuelos</span>
              </div>
            </button>

            <div class="navbar-links">
              <button class="nav-btn" data-view="buscar">Buscar Vuelos</button>
              <button class="nav-btn" data-view="reservas">Mis Reservas</button>
              <button class="nav-btn" data-view="billetes">Mis Billetes</button>
              <button class="nav-btn" data-view="perfil">Perfil</button>
            </div>

            <div class="navbar-actions">
              <div class="notifications-container">
                <button class="btn-notifications" id="btn-notificaciones" aria-label="Notificaciones">
                  🔔
                  <span class="notifications-badge" id="notif-badge" style="display: none;">0</span>
                </button>
                <div class="notifications-dropdown" id="notif-dropdown" style="display: none;">
                  <div class="notif-header">
                    <h4>Notificaciones</h4>
                    <button class="btn-text-small" id="btn-marcar-todas">Marcar todas</button>
                  </div>
                  <div class="notif-list" id="notif-list">
                    <div class="loading-spinner" style="padding: 20px;">Cargando...</div>
                  </div>
                </div>
              </div>
              <button class="btn-logout" id="logout-btn">Salir</button>
            </div>
          </div>
        </div>
      </nav>
    `;

    let content = '';
    switch (this.currentView) {
      case 'buscar':
        content = this.renderBuscarVuelos();
        break;
      case 'reservas':
        content = this.renderReservas();
        break;
      case 'billetes':
        content = this.renderBilletes();
        break;
      case 'perfil':
        content = this.renderPerfil();
        break;
      case 'reservar':
        content = this.renderFormReserva();
        break;
      case 'pagar':
        content = this.renderPago();
        break;
      default:
        content = this.renderHome();
    }

    return navbar + '<div class="main-container"><div class="content-wrapper">' + content + '</div></div>';
  }

  renderHome() {
    return `
      <div class="home-page-modern">
        <!-- Hero Section -->
        <div class="hero-section-modern">
          <div class="hero-background">
            <div class="hero-overlay"></div>
            <div class="floating-shapes">
              <div class="shape shape-1"></div>
              <div class="shape shape-2"></div>
              <div class="shape shape-3"></div>
            </div>
          </div>
          
          <div class="hero-content-modern">
            <div class="hero-badge">
              <span class="badge-icon">✈️</span>
              <span>Boletería JB</span>
            </div>
            
            <h1 class="hero-title-modern">
              ¡Bienvenido, <span class="hero-name-gradient">${this.currentUser?.nombre}</span>!
            </h1>
            
            <p class="hero-subtitle-modern">
              Tu próximo destino está a un clic de distancia
            </p>
            
            <div class="hero-features">
              <div class="hero-feature">
                <span class="feature-check">✓</span>
                <span>Búsqueda en tiempo real</span>
              </div>
              <div class="hero-feature">
                <span class="feature-check">✓</span>
                <span>Mejores tarifas garantizadas</span>
              </div>
              <div class="hero-feature">
                <span class="feature-check">✓</span>
                <span>Reserva rápida y segura</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions-section">
          <div class="section-header">
            <h2 class="section-title">¿Qué deseas hacer hoy?</h2>
            <p class="section-subtitle">Accede rápidamente a nuestros servicios</p>
          </div>

          <div class="action-cards-modern">
            <button data-view="buscar" class="action-card-modern action-card-primary">
              <div class="card-background"></div>
              <div class="card-content-modern">
                <div class="card-icon-modern">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <h3 class="card-title-modern">Buscar Vuelos</h3>
                <p class="card-description">Encuentra los mejores vuelos para tu próximo viaje</p>
                <div class="card-arrow">→</div>
              </div>
            </button>

            <button data-view="reservas" class="action-card-modern action-card-secondary">
              <div class="card-background"></div>
              <div class="card-content-modern">
                <div class="card-icon-modern">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                </div>
                <h3 class="card-title-modern">Mis Reservas</h3>
                <p class="card-description">Gestiona y consulta todas tus reservaciones</p>
                <div class="card-arrow">→</div>
              </div>
            </button>

            <button data-view="billetes" class="action-card-modern action-card-success">
              <div class="card-background"></div>
              <div class="card-content-modern">
                <div class="card-icon-modern">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path>
                  </svg>
                </div>
                <h3 class="card-title-modern">Mis Billetes</h3>
                <p class="card-description">Accede a tus billetes electrónicos</p>
                <div class="card-arrow">→</div>
              </div>
            </button>
          </div>
        </div>

        <!-- Actividad Reciente Section -->
        <div class="recent-activity-section">
          <div class="section-header">
            <h2 class="section-title">Tu Actividad Reciente</h2>
            <p class="section-subtitle">Tus últimas búsquedas y acciones</p>
          </div>

          <div class="activity-timeline">
            <div class="activity-item">
              <div class="activity-icon activity-icon-search">🔍</div>
              <div class="activity-content">
                <h4 class="activity-title">Búsqueda realizada</h4>
                <p class="activity-description">Guayaquil → Quito • 15 Nov 2025</p>
                <span class="activity-time">Hace 2 horas</span>
              </div>
              <button class="activity-action">Repetir</button>
            </div>

            <div class="activity-item">
              <div class="activity-icon activity-icon-ticket">🎫</div>
              <div class="activity-content">
                <h4 class="activity-title">Reserva confirmada</h4>
                <p class="activity-description">Vuelo AV-102 • Primera Clase</p>
                <span class="activity-time">Hace 1 día</span>
              </div>
              <button class="activity-action">Ver detalles</button>
            </div>

            <div class="activity-item">
              <div class="activity-icon activity-icon-plane">✈️</div>
              <div class="activity-content">
                <h4 class="activity-title">Check-in disponible</h4>
                <p class="activity-description">Quito → Galápagos • Mañana 08:30</p>
                <span class="activity-time">Disponible ahora</span>
              </div>
              <button class="activity-action">Check-in</button>
            </div>
          </div>
        </div>

        <!-- Tendencias de Temporada Section -->
        <div class="seasonal-trends-section">
          <div class="section-header">
            <h2 class="section-title">Tendencias de Temporada</h2>
            <p class="section-subtitle">Los destinos más populares este mes</p>
          </div>

          <div class="trends-grid">
            <div class="trend-card trend-hot">
              <div class="trend-badge">🔥 Más buscado</div>
              <div class="trend-image" style="background-image: url('/assets/galapagos.jpg');"></div>
              <div class="trend-content">
                <h3 class="trend-destination">Galápagos</h3>
                <p class="trend-description">Temporada ideal para observar fauna marina</p>
                <div class="trend-stats">
                  <span class="trend-stat">📈 +85% búsquedas</span>
                  <span class="trend-price">Desde $180</span>
                </div>
              </div>
            </div>

            <div class="trend-card">
              <div class="trend-badge">⭐ Recomendado</div>
              <div class="trend-image" style="background-image: url('/assets/cuenca.jpg');"></div>
              <div class="trend-content">
                <h3 class="trend-destination">Cuenca</h3>
                <p class="trend-description">Clima perfecto para explorar la ciudad</p>
                <div class="trend-stats">
                  <span class="trend-stat">📈 +45% búsquedas</span>
                  <span class="trend-price">Desde $55</span>
                </div>
              </div>
            </div>

            <div class="trend-card">
              <div class="trend-badge">🎉 Oferta</div>
              <div class="trend-image" style="background-image: url('/assets/Manta.jpg');"></div>
              <div class="trend-content">
                <h3 class="trend-destination">Manta</h3>
                <p class="trend-description">Playas y deportes acuáticos</p>
                <div class="trend-stats">
                  <span class="trend-stat">💰 -20% descuento</span>
                  <span class="trend-price">Desde $40</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA Section -->
        <div class="cta-section-modern">
          <div class="cta-content">
            <h2 class="cta-title">¿Listo para tu próxima aventura?</h2>
            <p class="cta-subtitle">Comienza a planear tu viaje ahora</p>
            <button data-view="buscar" class="cta-button">
              <span>Buscar Vuelos Ahora</span>
              <span class="cta-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderBuscarVuelos() {
    return `
      <div class="search-page">
        <div class="search-header">
          <div class="search-header-content">
            <div class="search-title-group">
              <h2 class="search-title">Búsqueda de Vuelos</h2>
              <p class="search-subtitle">Consulta disponibilidad en tiempo real • Comparación de precios • Mejor selección</p>
            </div>
          </div>
        </div>

        <div class="search-form-card">
          <div class="search-form-header">
            <div class="header-left">
              <h3>Parámetros de Búsqueda</h3>
              <p id="search-type-description" class="search-description">
                Resultados ordenados por mejor precio
              </p>
            </div>
            <div class="header-right">
              <div class="trip-type-toggle">
                <label class="toggle-option">
                  <input type="radio" name="trip_type" value="round_trip" checked />
                  <span class="toggle-text">Ida y Vuelta</span>
                </label>
                <label class="toggle-option">
                  <input type="radio" name="trip_type" value="one_way" />
                  <span class="toggle-text">Solo Ida</span>
                </label>
              </div>
            </div>
          </div>

          <div class="search-type-bar">
            <label class="search-type-btn">
              <input type="radio" name="search_type" value="tarifas" checked />
              <span class="btn-content">
                <span class="btn-icon">💰</span>
                <span class="btn-text">Por Tarifas</span>
              </span>
            </label>
            <label class="search-type-btn">
              <input type="radio" name="search_type" value="horarios" />
              <span class="btn-content">
                <span class="btn-icon">🕐</span>
                <span class="btn-text">Por Horarios</span>
              </span>
            </label>
          </div>

          <form id="buscar-form" class="search-form">
            <div class="form-row">
              <div class="form-group">
                <label>🛫 Origen</label>
                <select name="ciudad_origen_id" id="ciudad-origen" required>
                  <option value="">Seleccione ciudad de origen...</option>
                </select>
              </div>

              <div class="form-group">
                <label>🛬 Destino</label>
                <select name="ciudad_destino_id" id="ciudad-destino" required>
                  <option value="">Seleccione ciudad de destino...</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>📅 Fecha de Salida</label>
                <input type="date" name="fecha_salida" id="fecha-salida" required />
              </div>

              <div class="form-group" id="fecha-regreso-group">
                <label>📅 Fecha de Regreso</label>
                <input type="date" name="fecha_regreso" id="fecha-regreso" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>👥 Número de Pasajeros</label>
                <input type="number" name="num_pasajeros" min="1" max="9" value="1" required />
              </div>

              <div class="form-group">
                <label>💺 Clase de Vuelo</label>
                <select name="clase">
                  <option value="Economica">Turista (Económica)</option>
                  <option value="Ejecutiva">Ejecutiva (Business)</option>
                  <option value="Primera_Clase">Primera Clase</option>
                </select>
              </div>
            </div>

            <details class="advanced-filters">
              <summary>⚙️ Filtros Avanzados</summary>
              <div class="filters-content">
                <div class="form-row">
                  <div class="form-group">
                    <label>✈️ Aerolínea Preferida</label>
                    <select name="aerolinea" id="aerolinea-filter">
                      <option value="">Todas las aerolíneas</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Escalas</label>
                    <select name="escalas">
                      <option value="all">Cualquier número de escalas</option>
                      <option value="direct">Solo vuelos directos</option>
                      <option value="1">Máximo 1 escala</option>
                      <option value="2">Máximo 2 escalas</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Horario de Salida</label>
                    <select name="horario_salida">
                      <option value="all">Cualquier horario</option>
                      <option value="morning">Mañana (6:00 - 12:00)</option>
                      <option value="afternoon">Tarde (12:00 - 18:00)</option>
                      <option value="evening">Noche (18:00 - 24:00)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Precio Máximo</label>
                    <input type="number" name="precio_max" placeholder="Sin límite" min="0" step="50" />
                  </div>
                </div>
              </div>
            </details>

            <button type="submit" class="btn btn-primary btn-block btn-large">
              🔍 Buscar Vuelos Disponibles
            </button>
          </form>
        </div>

        <div id="resultados-vuelos"></div>
      </div>
    `;
  }

  renderReservas() {
    return `
      <div class="section-page">
        <div class="section-header">
          <div class="section-header-content">
            <div>
              <h2 class="section-title">Mis Reservas</h2>
              <p class="section-subtitle">Administra y consulta tus reservaciones activas</p>
            </div>
            <div class="section-badge">
              <span class="badge-label">Total</span>
              <span class="badge-count" id="count-reservas">0</span>
            </div>
          </div>
        </div>

        <div class="section-content">
          <div class="empty-state" id="empty-reservas" style="display: none;">
            <div class="empty-icon">✈️</div>
            <h3 class="empty-title">No tienes reservas activas</h3>
            <p class="empty-text">Busca y reserva tu próximo vuelo para comenzar</p>
            <button data-view="buscar" class="btn btn-primary">Buscar Vuelos</button>
          </div>
          <div id="lista-reservas" class="items-grid">
            <div class="loading-spinner">Cargando reservas...</div>
          </div>
        </div>
      </div>
    `;
  }

  renderBilletes() {
    return `
      <div class="section-page">
        <div class="section-header">
          <div class="section-header-content">
            <div>
              <h2 class="section-title">Mis Billetes</h2>
              <p class="section-subtitle">Billetes confirmados y listos para viajar</p>
            </div>
            <div class="section-badge">
              <span class="badge-label">Total</span>
              <span class="badge-count" id="count-billetes">0</span>
            </div>
          </div>
        </div>

        <div class="section-filters">
          <div class="filter-group">
            <label class="filter-label">Filtrar por:</label>
            <select class="filter-select" id="filter-billetes">
              <option value="todos">Todos los billetes</option>
              <option value="proximos">Próximos vuelos</option>
              <option value="pasados">Vuelos pasados</option>
            </select>
          </div>
          <div class="filter-search">
            <input type="text" class="search-input" placeholder="Buscar por código de vuelo..." id="search-billetes" />
          </div>
        </div>

        <div class="section-content">
          <div class="empty-state" id="empty-billetes" style="display: none;">
            <div class="empty-icon">🎫</div>
            <h3 class="empty-title">No tienes billetes confirmados</h3>
            <p class="empty-text">Confirma una reserva para obtener tu billete electrónico</p>
            <button data-view="reservas" class="btn btn-primary">Ver Reservas</button>
          </div>
          <div id="lista-billetes" class="items-grid">
            <div class="loading-spinner">Cargando billetes...</div>
          </div>
        </div>
      </div>
    `;
  }

  renderPerfil() {
    return `
      <div class="section-page">
        <div class="section-header">
          <div class="section-header-content">
            <div>
              <h2 class="section-title">Mi Perfil</h2>
              <p class="section-subtitle">Administra tu información personal</p>
            </div>
          </div>
        </div>

        <div class="profile-container">
          <div class="profile-sidebar">
            <div class="profile-avatar">
              <div class="avatar-circle">
                <span class="avatar-initials">${this.currentUser?.nombre?.charAt(0) || 'U'}${this.currentUser?.apellido?.charAt(0) || 'S'}</span>
              </div>
              <h3 class="profile-name">${this.currentUser?.nombre || ''} ${this.currentUser?.apellido || ''}</h3>
              <p class="profile-email">${this.currentUser?.email || ''}</p>
            </div>

            <div class="profile-stats">
              <div class="stat-item">
                <div class="stat-icon">✈️</div>
                <div class="stat-info">
                  <div class="stat-value" id="total-vuelos">0</div>
                  <div class="stat-name">Vuelos Realizados</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">🎫</div>
                <div class="stat-info">
                  <div class="stat-value" id="total-reservas">0</div>
                  <div class="stat-name">Reservas Activas</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">⭐</div>
                <div class="stat-info">
                  <div class="stat-value">VIP</div>
                  <div class="stat-name">Categoría</div>
                </div>
              </div>
            </div>
          </div>

          <div class="profile-content">
            <div class="profile-card">
              <h3 class="card-header">Información Personal</h3>
              <form id="perfil-form" class="profile-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" name="nombre" value="${this.currentUser?.nombre || ''}" required />
                  </div>
                  <div class="form-group">
                    <label>Apellido</label>
                    <input type="text" name="apellido" value="${this.currentUser?.apellido || ''}" required />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Correo Electrónico</label>
                    <input type="email" name="email" value="${this.currentUser?.email || ''}" required />
                  </div>
                  <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" name="telefono" value="${this.currentUser?.telefono || ''}" placeholder="+1 (555) 000-0000" />
                  </div>
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                  <button type="button" class="btn btn-secondary" id="cancel-perfil">Cancelar</button>
                </div>
              </form>
            </div>

            <div class="profile-card">
              <h3 class="card-header">Seguridad</h3>
              <form id="password-form" class="profile-form">
                <div class="form-group">
                  <label>Contraseña Actual</label>
                  <input type="password" name="current_password" placeholder="Ingresa tu contraseña actual" />
                </div>
                <div class="form-group">
                  <label>Nueva Contraseña</label>
                  <input type="password" name="new_password" placeholder="Mínimo 6 caracteres" />
                </div>
                <div class="form-group">
                  <label>Confirmar Nueva Contraseña</label>
                  <input type="password" name="confirm_password" placeholder="Repite la nueva contraseña" />
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn btn-primary">Cambiar Contraseña</button>
                </div>
              </form>
            </div>

            <div class="profile-card">
              <h3 class="card-header">Preferencias de Viaje</h3>
              <form id="preferences-form" class="profile-form">
                <div class="form-group">
                  <label>Clase Preferida</label>
                  <select name="clase_preferida">
                    <option value="Economica">Turista (Económica)</option>
                    <option value="Ejecutiva">Ejecutiva (Business)</option>
                    <option value="Primera">Primera Clase</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Asiento Preferido</label>
                  <select name="asiento_preferido">
                    <option value="ventana">Ventana</option>
                    <option value="pasillo">Pasillo</option>
                    <option value="medio">Medio</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>
                    <input type="checkbox" name="newsletter" /> 
                    Recibir ofertas y promociones por email
                  </label>
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn btn-primary">Guardar Preferencias</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderFormReserva() {
    if (!this.selectedFlight) {
      return '<p>No hay vuelo seleccionado</p>';
    }

    // Verificar si es ida y vuelta o un solo vuelo
    const esIdaYVuelta = (this.selectedFlight as any).esIdaYVuelta === true;
    const vuelos = esIdaYVuelta ? (this.selectedFlight as any).vuelos : [this.selectedFlight];
    
    // Calcular precio total
    const precioTotal = vuelos.reduce((sum: number, v: any) => sum + parseFloat(v.precio), 0);
    
    return `
      <div class="reserva-form">
        <h2>
          <span style="display: inline-block; margin-right: 8px;">✈️</span>
          Reservar Vuelo${esIdaYVuelta ? 's' : ''}
        </h2>
        
        ${vuelos.map((flight: any, index: number) => `
          <div class="flight-info" style="background: linear-gradient(135deg, ${index === 0 ? '#667eea 0%, #764ba2' : '#f093fb 0%, #f5576c'} 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
              <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                ${esIdaYVuelta ? (index === 0 ? '✈️ Vuelo de Ida' : '🔄 Vuelo de Regreso') : '✈️ Vuelo'}
              </span>
            </div>
            <h3 style="margin: 0 0 12px 0; font-size: 1.3rem; font-weight: 700;">
              ${flight.numero_vuelo} - ${flight.aerolinea}
            </h3>
            <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 1rem;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="opacity: 0.9;">📍</span>
                <span style="font-weight: 600;">${flight.origen}</span>
                <span style="opacity: 0.8;">→</span>
                <span style="font-weight: 600;">${flight.destino}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="opacity: 0.9;">📅</span>
                <span>${flight.fecha}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="opacity: 0.9;">🕐</span>
                <span>${flight.hora_salida}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="opacity: 0.9;">💵</span>
                <span style="font-weight: 700; font-size: 1.1rem;">$${parseFloat(flight.precio).toFixed(2)}</span>
              </div>
            </div>
          </div>
        `).join('')}
        
        ${esIdaYVuelta ? `
          <div style="background: #f0fdf4; border: 2px solid #86efac; padding: 16px; border-radius: 10px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 10px; color: #166534;">
              <span style="font-size: 1.5rem;">💰</span>
              <div>
                <div style="font-weight: 700; font-size: 1.1rem;">Precio Total (Ida y Vuelta)</div>
                <div style="font-size: 1.4rem; font-weight: 800; color: #15803d;">$${precioTotal.toFixed(2)}</div>
              </div>
            </div>
          </div>
        ` : ''}
        
        <!-- Mapa de asientos -->
        ${esIdaYVuelta ? `
          <!-- Asientos para vuelo de ida -->
          <div class="asientos-section" style="margin: 24px 0; padding: 20px; background: #f8f9ff; border-radius: 12px; border: 2px solid #667eea;">
            <h3 style="color: #667eea; margin-bottom: 8px;">
              ✈️ Asientos - Vuelo de Ida
            </h3>
            <p style="color: #64748b; margin-bottom: 16px; font-size: 0.9rem;">
              ${vuelos[0].numero_vuelo} | ${vuelos[0].origen} → ${vuelos[0].destino}
            </p>
            <p style="color: #64748b; margin-bottom: 16px;">
              ${this.numPasajeros > '1' ? `Debe seleccionar exactamente ${this.numPasajeros} asientos para ${this.numPasajeros} pasajeros` : 'Seleccione un asiento disponible'}
            </p>
            <div id="mapa-asientos-ida-container">
              <div class="loading-spinner">Cargando mapa de asientos...</div>
            </div>
            <div class="asiento-seleccionado" id="asiento-info-ida" style="display: none; margin-top: 12px; padding: 12px; background: #e0f2fe; border-radius: 8px;">
              <strong>Asiento(s) seleccionado(s) - Ida:</strong> <span id="asiento-numero-ida"></span>
            </div>
          </div>
          
          <!-- Asientos para vuelo de vuelta -->
          <div class="asientos-section" style="margin: 24px 0; padding: 20px; background: #fff8f8; border-radius: 12px; border: 2px solid #f5576c;">
            <h3 style="color: #f5576c; margin-bottom: 8px;">
              🔄 Asientos - Vuelo de Regreso
            </h3>
            <p style="color: #64748b; margin-bottom: 16px; font-size: 0.9rem;">
              ${vuelos[1].numero_vuelo} | ${vuelos[1].origen} → ${vuelos[1].destino}
            </p>
            <p style="color: #64748b; margin-bottom: 16px;">
              ${this.numPasajeros > '1' ? `Debe seleccionar exactamente ${this.numPasajeros} asientos para ${this.numPasajeros} pasajeros` : 'Seleccione un asiento disponible'}
            </p>
            <div id="mapa-asientos-vuelta-container">
              <div class="loading-spinner">Cargando mapa de asientos...</div>
            </div>
            <div class="asiento-seleccionado" id="asiento-info-vuelta" style="display: none; margin-top: 12px; padding: 12px; background: #fee2e2; border-radius: 8px;">
              <strong>Asiento(s) seleccionado(s) - Vuelta:</strong> <span id="asiento-numero-vuelta"></span>
            </div>
          </div>
        ` : `
          <!-- Asientos para un solo vuelo -->
          <div class="asientos-section" style="margin: 24px 0;">
            <h3>Seleccione ${this.numPasajeros > '1' ? `${this.numPasajeros} asientos` : 'su asiento'}</h3>
            <p style="color: #64748b; margin-bottom: 16px;">
              ${this.numPasajeros > '1' ? `Debe seleccionar exactamente ${this.numPasajeros} asientos para ${this.numPasajeros} pasajeros` : 'Seleccione un asiento disponible'}
            </p>
            <div id="mapa-asientos-container">
              <div class="loading-spinner">Cargando mapa de asientos...</div>
            </div>
            <div class="asiento-seleccionado" id="asiento-info" style="display: none; margin-top: 12px; padding: 12px; background: #e0f2fe; border-radius: 8px;">
              <strong>Asiento(s) seleccionado(s):</strong> <span id="asiento-numero"></span>
            </div>
          </div>
        `}
        
        <form id="reserva-form">
          <h3>Datos de Pasajeros</h3>
          <div id="pasajeros-container"></div>
          <button type="submit" class="btn-primary" id="btn-confirmar-reserva">Confirmar Reserva</button>
        </form>
      </div>
    `;
  }

  renderPago() {
    const reservasPendientes = (window as any).reservasPendientes || [];
    
    if (reservasPendientes.length === 0) {
      return `
        <div class="pago-container">
          <div class="pago-header">
            <h2>💳 Procesar Pago</h2>
            <p>No hay reservas pendientes de pago</p>
          </div>
          <button class="btn btn-primary" data-view="reservas">Ver Mis Reservas</button>
        </div>
      `;
    }

    const reserva = reservasPendientes[0]; // Tomar la primera reserva pendiente
    
    return `
      <div class="pago-container">
        <div class="pago-header">
          <h2>💳 Procesar Pago</h2>
          <p>Completa los datos de pago para confirmar tu reserva</p>
        </div>

        <div class="pago-layout">
          <!-- Formulario de Pago -->
          <div class="metodos-pago">
            <h3>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle;">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke-width="2"/>
                <path d="M2 10h20" stroke-width="2"/>
              </svg>
              Método de Pago
            </h3>

            <!-- Tabs de Método -->
            <div class="payment-tabs">
              <button class="payment-tab active" data-payment-method="saved">
                💳 Tarjetas Guardadas
              </button>
              <button class="payment-tab" data-payment-method="new">
                ➕ Nueva Tarjeta
              </button>
            </div>

            <!-- Tarjetas Guardadas -->
            <div id="saved-cards-section" class="saved-cards">
              <div class="loading-spinner" style="text-align: center; padding: 20px;">
                Cargando tarjetas...
              </div>
            </div>

            <!-- Formulario Nueva Tarjeta -->
            <div id="new-card-section" style="display: none;">
              <div class="card-form">
                <div class="field-group">
                  <label>Número de Tarjeta *</label>
                  <input 
                    type="text" 
                    id="card-number" 
                    placeholder="1234 5678 9012 3456"
                    maxlength="19"
                    required
                  />
                </div>

                <div class="field-group">
                  <label>Nombre del Titular *</label>
                  <input 
                    type="text" 
                    id="card-holder" 
                    placeholder="JUAN PÉREZ"
                    style="text-transform: uppercase;"
                    required
                  />
                </div>

                <div class="card-form-row">
                  <div class="field-group">
                    <label>Fecha de Expiración *</label>
                    <input 
                      type="text" 
                      id="card-expiry" 
                      placeholder="MM/AAAA"
                      maxlength="7"
                      required
                    />
                  </div>

                  <div class="field-group">
                    <label>CVV *</label>
                    <input 
                      type="text" 
                      id="card-cvv" 
                      placeholder="123"
                      maxlength="4"
                      required
                    />
                  </div>
                </div>

                <div class="field-group">
                  <label>Tipo de Tarjeta *</label>
                  <select id="card-type">
                    <option value="VISA">VISA</option>
                    <option value="MASTERCARD">MASTERCARD</option>
                    <option value="AMEX">AMERICAN EXPRESS</option>
                  </select>
                </div>

                <label style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
                  <input type="checkbox" id="save-card" />
                  <span style="font-size: 13px; color: #64748b;">Guardar esta tarjeta para futuros pagos</span>
                </label>
              </div>
            </div>

            <!-- Método de Entrega -->
            <div class="metodo-entrega">
              <h4>📧 Método de Entrega</h4>
              <div class="entrega-options">
                <div class="entrega-option selected" data-entrega="EMAIL">
                  <input type="radio" name="entrega" value="EMAIL" checked id="entrega-email" />
                  <label for="entrega-email">
                    <div class="entrega-icon">📧</div>
                    <div class="entrega-text">Email</div>
                  </label>
                </div>
                <div class="entrega-option" data-entrega="AEROPUERTO">
                  <input type="radio" name="entrega" value="AEROPUERTO" id="entrega-aeropuerto" />
                  <label for="entrega-aeropuerto">
                    <div class="entrega-icon">🛫</div>
                    <div class="entrega-text">Aeropuerto</div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Botón de Pagar -->
            <button class="pagar-btn" id="btn-procesar-pago" disabled>
              🔒 Procesar Pago - $${reserva.total}
            </button>
          </div>

          <!-- Resumen de Reserva -->
          <div class="resumen-reserva">
            <h3>
              🎫 Resumen de Reserva
            </h3>

            <div class="resumen-item">
              <span class="resumen-label">Código de Reserva</span>
              <span class="resumen-value" style="font-family: monospace; color: #3b82f6;">${reserva.codigo_reserva}</span>
            </div>

            <div class="resumen-item">
              <span class="resumen-label">Pasajeros</span>
              <span class="resumen-value">${reserva.detalles.length}</span>
            </div>

            <div class="resumen-item">
              <span class="resumen-label">Clase</span>
              <span class="resumen-value">${reserva.detalles[0].clase}</span>
            </div>

            <div class="resumen-item">
              <span class="resumen-label">Estado</span>
              <span class="resumen-value" style="color: #f59e0b; font-weight: 600;">⏱️ ${reserva.estado}</span>
            </div>

            <div class="resumen-total">
              <span>Total a Pagar</span>
              <span>$${reserva.total}</span>
            </div>

            <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px; font-size: 12px; color: #92400e;">
              <strong>⚠️ Importante:</strong> Una vez procesado el pago, recibirás tu billete electrónico por email.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachAuthEvents() {
    // Tabs
    document.querySelectorAll('.auth-tab-modern').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const button = (e.target as HTMLElement).closest('.auth-tab-modern') as HTMLElement;
        if (!button) return;
        
        const tabName = button.dataset.tab;
        
        // Remover clase activa de todos los tabs
        document.querySelectorAll('.auth-tab-modern').forEach(t => {
          t.classList.remove('active');
        });
        
        // Agregar clase activa al tab clickeado
        button.classList.add('active');
        
        document.getElementById('login-form')!.style.display = tabName === 'login' ? 'block' : 'none';
        document.getElementById('registro-form')!.style.display = tabName === 'registro' ? 'block' : 'none';
        
        // Limpiar errores al cambiar de tab
        this.clearFormErrors('login-form');
        this.clearFormErrors('registro-form');
      });
    });

    // Validación en tiempo real - Login
    const loginEmail = document.getElementById('login-email') as HTMLInputElement;
    const loginPassword = document.getElementById('login-password') as HTMLInputElement;
    
    loginEmail?.addEventListener('blur', () => {
      const validation = Validator.email(loginEmail.value);
      this.showFieldError('login-email', validation);
    });
    
    loginPassword?.addEventListener('blur', () => {
      const validation = Validator.password(loginPassword.value);
      this.showFieldError('login-password', validation);
    });

    // Validación en tiempo real - Registro
    const regNombre = document.getElementById('reg-nombre') as HTMLInputElement;
    const regApellido = document.getElementById('reg-apellido') as HTMLInputElement;
    const regEmail = document.getElementById('reg-email') as HTMLInputElement;
    const regPassword = document.getElementById('reg-password') as HTMLInputElement;
    const regTelefono = document.getElementById('reg-telefono') as HTMLInputElement;
    
    regNombre?.addEventListener('blur', () => {
      const validation = Validator.name(regNombre.value);
      this.showFieldError('reg-nombre', validation);
    });
    
    regApellido?.addEventListener('blur', () => {
      const validation = Validator.name(regApellido.value);
      this.showFieldError('reg-apellido', validation);
    });
    
    regEmail?.addEventListener('blur', () => {
      const validation = Validator.email(regEmail.value);
      this.showFieldError('reg-email', validation);
    });
    
    regPassword?.addEventListener('blur', () => {
      const validation = Validator.password(regPassword.value);
      this.showFieldError('reg-password', validation);
    });
    
    regTelefono?.addEventListener('blur', () => {
      if (regTelefono.value) {
        const validation = Validator.phone(regTelefono.value);
        this.showFieldError('reg-telefono', validation);
      }
    });

    // Forgot Password Link
    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showForgotPasswordModal();
    });

    // Resend Verification Link
    document.getElementById('resend-verification-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showResendVerificationModal();
    });

    // Login Submit
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      
      // Validar antes de enviar
      const emailValidation = Validator.email(email);
      const passwordValidation = Validator.password(password);
      
      this.showFieldError('login-email', emailValidation);
      this.showFieldError('login-password', passwordValidation);
      
      if (!emailValidation.valid || !passwordValidation.valid) {
        notify.show('Por favor, corrija los errores en el formulario', 'error');
        return;
      }
      
      try {
        const response = await authAPI.login({
          username: email,
          password: password
        });
        localStorage.setItem('token', response.data.access_token);
        const userResponse = await authAPI.getPerfil();
        this.setUser(userResponse.data);
        notify.show(`¡Bienvenido, ${userResponse.data.nombre}!`, 'success');
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Error al iniciar sesión';
        notify.show(errorMessage, 'error');
      }
    });

    // Registro Submit
    document.getElementById('registro-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const nombre = formData.get('nombre') as string;
      const apellido = formData.get('apellido') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const telefono = formData.get('telefono') as string;
      
      // Validar todos los campos
      const nombreValidation = Validator.name(nombre);
      const apellidoValidation = Validator.name(apellido);
      const emailValidation = Validator.email(email);
      const passwordValidation = Validator.password(password);
      const telefonoValidation = Validator.phone(telefono);
      
      this.showFieldError('reg-nombre', nombreValidation);
      this.showFieldError('reg-apellido', apellidoValidation);
      this.showFieldError('reg-email', emailValidation);
      this.showFieldError('reg-password', passwordValidation);
      this.showFieldError('reg-telefono', telefonoValidation);
      
      if (!nombreValidation.valid || !apellidoValidation.valid || 
          !emailValidation.valid || !passwordValidation.valid || !telefonoValidation.valid) {
        notify.show('Por favor, corrija los errores en el formulario', 'error');
        return;
      }
      
      try {
        await authAPI.registro({
          nombre,
          apellido,
          email,
          password,
          telefono: telefono || undefined
        });
        
        // Mostrar mensaje de verificación de email
        notify.show(`✉️ Registro exitoso! Hemos enviado un email de verificación a ${email}. Por favor, verifica tu correo para activar tu cuenta.`, 'success', 8000);
        
        // Limpiar formulario
        form.reset();
        this.clearFormErrors('registro-form');
        
        // Cambiar a tab de login después de 3 segundos
        setTimeout(() => {
          document.querySelectorAll('.auth-tab-modern').forEach(t => t.classList.remove('active'));
          document.querySelector('[data-tab="login"]')?.classList.add('active');
          document.getElementById('login-form')!.style.display = 'block';
          document.getElementById('registro-form')!.style.display = 'none';
          notify.show('Por favor, verifica tu email antes de iniciar sesión', 'info', 5000);
        }, 3000);
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Error al registrarse';
        notify.show(errorMessage, 'error');
      }
    });
  }

  showFieldError(fieldId: string, validation: { valid: boolean; message: string }) {
    const input = document.getElementById(fieldId) as HTMLInputElement;
    const errorDiv = document.getElementById(`${fieldId}-error`);
    
    if (!input || !errorDiv) return;
    
    if (validation.valid) {
      input.classList.remove('invalid');
      input.classList.add('valid');
      errorDiv.classList.remove('show');
      errorDiv.textContent = '';
    } else {
      input.classList.remove('valid');
      input.classList.add('invalid');
      errorDiv.classList.add('show');
      errorDiv.textContent = validation.message;
    }
  }

  clearFormErrors(formId: string) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.querySelectorAll('.field-error').forEach(el => {
      el.classList.remove('show');
      el.textContent = '';
    });
    
    form.querySelectorAll('.invalid, .valid').forEach(el => {
      el.classList.remove('invalid', 'valid');
    });
  }

  showResendVerificationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2>📧 Reenviar Email de Verificación</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 20px; color: #6b7280;">
            Si no recibiste el email de verificación, ingresa tu correo y te lo reenviaremos.
          </p>
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 20px; border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
              💡 <strong>Tip:</strong> Revisa también tu carpeta de SPAM o Correo no deseado.
            </p>
          </div>
          <form id="resend-verification-form">
            <div class="form-group">
              <label>Correo Electrónico</label>
              <input type="email" id="resend-email" required placeholder="tu@email.com" />
              <div class="field-error" id="resend-email-error"></div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary modal-cancel">Cancelar</button>
              <button type="submit" class="btn btn-success">📨 Reenviar Email</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
    modal.querySelector('.modal-cancel')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Form submit
    modal.querySelector('#resend-verification-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (document.getElementById('resend-email') as HTMLInputElement).value;

      const emailValidation = Validator.email(email);
      if (!emailValidation.valid) {
        const errorDiv = document.getElementById('resend-email-error');
        if (errorDiv) {
          errorDiv.textContent = emailValidation.message;
          errorDiv.classList.add('show');
        }
        return;
      }

      try {
        await this.reenviarVerificacion(email);
        closeModal();
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Error al reenviar email';
        notify.show(errorMessage, 'error');
      }
    });
  }

  showForgotPasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2>🔐 Recuperar Contraseña</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 20px; color: #6b7280;">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <form id="forgot-password-form">
            <div class="form-group">
              <label>Correo Electrónico</label>
              <input type="email" id="forgot-email" required placeholder="tu@email.com" />
              <div class="field-error" id="forgot-email-error"></div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary modal-cancel">Cancelar</button>
              <button type="submit" class="btn btn-primary">Enviar Enlace</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
    modal.querySelector('.modal-cancel')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Form submit
    modal.querySelector('#forgot-password-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (document.getElementById('forgot-email') as HTMLInputElement).value;

      const emailValidation = Validator.email(email);
      if (!emailValidation.valid) {
        const errorDiv = document.getElementById('forgot-email-error');
        if (errorDiv) {
          errorDiv.textContent = emailValidation.message;
          errorDiv.classList.add('show');
        }
        return;
      }

      try {
        await authAPI.solicitarRecuperacionPassword(email);
        notify.show('📧 Si existe una cuenta con ese email, recibirás un correo con instrucciones para recuperar tu contraseña', 'success', 8000);
        closeModal();
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Error al solicitar recuperación de contraseña';
        notify.show(errorMessage, 'error');
      }
    });
  }

  attachAppEvents() {
    // Navigation - navbar brand (logo)
    document.querySelector('.navbar-brand')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigate('home');
    });

    // Navigation - navbar buttons
    document.querySelectorAll('.nav-btn').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const view = target.dataset.view || target.closest('[data-view]')?.getAttribute('data-view');
        if (view) {
          this.navigate(view);
        }
      });
    });

    // Navigation - home action cards
    document.querySelectorAll('.action-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const view = target.dataset.view;
        if (view) {
          this.navigate(view);
        }
      });
    });

    // Navigation - empty state buttons
    document.querySelectorAll('.empty-state button[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const view = target.dataset.view;
        if (view) {
          this.navigate(view);
        }
      });
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      localStorage.removeItem('token');
      this.setUser(null);
      notify.show('Sesión cerrada correctamente', 'info');
    });

    // Event listeners para notificaciones
    this.attachNotificacionesEvents();
    this.cargarContadorNotificaciones();
    this.iniciarPollingNotificaciones();

    // Eventos específicos de cada vista
    if (this.currentView === 'buscar') {
      this.loadCiudades();
      this.loadAerolineas();
      this.attachBuscarEvents();
    } else if (this.currentView === 'reservas') {
      this.loadReservas();
    } else if (this.currentView === 'billetes') {
      this.loadBilletes();
      this.attachBilletesEvents();
    } else if (this.currentView === 'perfil') {
      this.attachPerfilEvents();
      this.loadPerfilStats();
    } else if (this.currentView === 'reservar') {
      this.attachReservaEvents();
    } else if (this.currentView === 'pagar') {
      this.attachPagoEvents();
      this.loadTarjetas();
    }
  }

  async loadCiudades() {
    try {
      const response = await vuelosAPI.getCiudades();
      const ciudades = response.data;
      const origenSelect = document.getElementById('ciudad-origen') as HTMLSelectElement;
      const destinoSelect = document.getElementById('ciudad-destino') as HTMLSelectElement;
      
      const options = ciudades.map((c: Ciudad) => `<option value="${c.codigo_iata}">${c.nombre}, ${c.pais}</option>`).join('');
      origenSelect.innerHTML = '<option value="">Seleccione origen</option>' + options;
      destinoSelect.innerHTML = '<option value="">Seleccione destino</option>' + options;
    } catch (error) {
      console.error('Error cargando ciudades:', error);
    }
  }

  async loadAerolineas() {
    try {
      const response = await vuelosAPI.getAerolineas();
      const aerolineas = response.data;
      const aerolineaSelect = document.getElementById('aerolinea-filter') as HTMLSelectElement;
      
      if (aerolineaSelect) {
        const options = aerolineas
          .filter((a: any) => a.activa)
          .map((a: any) => `<option value="${a.codigo_iata}">${a.nombre}</option>`)
          .join('');
        aerolineaSelect.innerHTML = '<option value="">Todas las aerolíneas</option>' + options;
      }
    } catch (error) {
      console.error('Error cargando aerolíneas:', error);
    }
  }

  attachBuscarEvents() {
    // Cambiar descripción según tipo de búsqueda
    document.querySelectorAll('input[name="search_type"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const description = document.getElementById('search-type-description');
        if (description) {
          if (target.value === 'tarifas') {
            description.textContent = 'Resultados ordenados por mejor precio';
          } else {
            description.textContent = 'Resultados ordenados por horario de salida';
          }
        }
      });
    });

    // Toggle tipo de viaje (ida y vuelta / solo ida)
    document.querySelectorAll('input[name="trip_type"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const fechaRegresoGroup = document.getElementById('fecha-regreso-group');
        const fechaRegresoInput = document.getElementById('fecha-regreso') as HTMLInputElement;
        
        if (target.value === 'one_way') {
          fechaRegresoGroup!.style.opacity = '0.5';
          fechaRegresoInput.removeAttribute('required');
          fechaRegresoInput.disabled = true;
        } else {
          fechaRegresoGroup!.style.opacity = '1';
          fechaRegresoInput.disabled = false;
        }
      });
    });

    // Validación de fechas
    const fechaSalidaInput = document.getElementById('fecha-salida') as HTMLInputElement;
    const fechaRegresoInput = document.getElementById('fecha-regreso') as HTMLInputElement;
    
    // Establecer fecha mínima como hoy (usando hora local)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    fechaSalidaInput.min = todayStr;
    fechaRegresoInput.min = todayStr;

    fechaSalidaInput.addEventListener('change', () => {
      fechaRegresoInput.min = fechaSalidaInput.value;
      if (fechaRegresoInput.value && fechaRegresoInput.value < fechaSalidaInput.value) {
        fechaRegresoInput.value = '';
      }
    });

    document.getElementById('buscar-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const origen = formData.get('ciudad_origen_id') as string;
      const destino = formData.get('ciudad_destino_id') as string;
      const fecha = formData.get('fecha_salida') as string;
      const fechaRegreso = formData.get('fecha_regreso') as string;
      const tripType = (document.querySelector('input[name="trip_type"]:checked') as HTMLInputElement)?.value;
      
      // Validaciones
      if (!origen || !destino || !fecha) {
        notify.show('Por favor, complete todos los campos requeridos', 'warning');
        return;
      }
      
      if (origen === destino) {
        notify.show('La ciudad de origen y destino no pueden ser iguales', 'warning');
        return;
      }

      if (tripType === 'round_trip' && fechaRegreso && fechaRegreso < fecha) {
        notify.show('La fecha de regreso debe ser posterior a la fecha de salida', 'warning');
        return;
      }
      
      try {
        notify.show('🔍 Buscando vuelos disponibles...', 'info', 2000);
        
        const aerolineaCodigo = formData.get('aerolinea') as string;
        const searchType = (document.querySelector('input[name="search_type"]:checked') as HTMLInputElement)?.value || 'tarifas';
        const horarioSalida = formData.get('horario_salida') as string;
        const precioMaximoStr = formData.get('precio_max') as string;
        const escalas = formData.get('escalas') as string;
        
        const busquedaParams: any = {
          origen,
          destino,
          fecha,
          clase: formData.get('clase') as string,
          aerolinea_codigo: aerolineaCodigo || undefined
        };
        
        // Agregar filtros opcionales si están presentes
        if (horarioSalida && horarioSalida !== 'all') {
          busquedaParams.horario_salida = horarioSalida;
        }
        
        if (precioMaximoStr && precioMaximoStr.trim() !== '') {
          const precioMax = parseFloat(precioMaximoStr);
          if (!isNaN(precioMax) && precioMax > 0) {
            busquedaParams.precio_maximo = precioMax;
          }
        }

        // Filtro de escalas (solo directos está implementado en backend)
        if (escalas === 'direct') {
          busquedaParams.solo_directos = true;
        } else {
          busquedaParams.solo_directos = false;
        }
        
        // Usar el endpoint correcto según el tipo de búsqueda
        const response = searchType === 'horarios' 
          ? await vuelosAPI.buscarPorHorarios(busquedaParams)
          : await vuelosAPI.buscarPorTarifas(busquedaParams);

        console.log('🔍 RESPUESTA DEL BACKEND:', response);
        console.log('📊 Datos recibidos:', response.data);
        console.log('📈 Cantidad de vuelos:', response.data.length);
        console.log('🔬 Tipo de response.data:', typeof response.data);
        console.log('🔬 Es un array?', Array.isArray(response.data));
        
        if (response.data && response.data.length > 0) {
          console.log('✅ Primer vuelo:', response.data[0]);
        }

        // Verificar si es ida y vuelta
        const esIdaYVuelta = tripType === 'round_trip' && !!fechaRegreso;
        
        this.renderVuelosResults(response.data, formData, esIdaYVuelta);
        
        if (response.data.length > 0) {
          if (esIdaYVuelta && !this.vueloIdaSeleccionado) {
            notify.show(`✅ Se encontraron ${response.data.length} vuelo(s) de ida. Selecciona uno para continuar`, 'success');
          } else {
            notify.show(`✅ Se encontraron ${response.data.length} vuelo(s) disponible(s)`, 'success');
          }
        } else {
          notify.show('ℹ️ No se encontraron vuelos para esta búsqueda. Intente con otras fechas', 'info');
        }
      } catch (error) {
        console.error('❌ ERROR CAPTURADO:', error);
        console.error('❌ Detalles del error:', JSON.stringify(error, null, 2));
        document.getElementById('resultados-vuelos')!.innerHTML = '<div class="error-state"><p>❌ Error al buscar vuelos. Por favor, intente nuevamente.</p></div>';
        notify.show('Error al buscar vuelos. Intente nuevamente', 'error');
      }
    });
  }

  renderVuelosResults(vuelos: VueloDisponible[], formData?: FormData, esIdaYVuelta: boolean = false) {
    console.log('🎨 renderVuelosResults llamado con:', vuelos);
    console.log('🎨 Longitud del array:', vuelos?.length);
    console.log('🎨 Es ida y vuelta:', esIdaYVuelta);
    console.log('🎨 Vuelo ida seleccionado:', this.vueloIdaSeleccionado);
    
    try {
      const container = document.getElementById('resultados-vuelos')!;
      
      if (vuelos.length === 0) {
        console.log('⚠️ Array vacío - mostrando mensaje de "no encontrado"');
        container.innerHTML = `
          <div class="results-empty">
            <div class="empty-icon">✈️</div>
            <h3>No se encontraron vuelos</h3>
            <p>Intenta modificar tus criterios de búsqueda o seleccionar otras fechas</p>
          </div>
        `;
        return;
      }

      const numPasajeros = formData?.get('num_pasajeros') || '1';
      
      // Determinar el título según el tipo de búsqueda
      let tituloSeccion = '✈️ Vuelos Disponibles';
      if (esIdaYVuelta && !this.vueloIdaSeleccionado) {
        tituloSeccion = '🛫 Selecciona tu Vuelo de Ida';
      } else if (esIdaYVuelta && this.vueloIdaSeleccionado) {
        tituloSeccion = '🛬 Selecciona tu Vuelo de Regreso';
      }
      
      console.log('🎨 Generando HTML para', vuelos.length, 'vuelos...');

      let headerHTML = `
      <div class="results-header">
        <h3>${tituloSeccion} (${vuelos.length})</h3>
        <div class="results-sort">
          <label>Ordenar por:</label>
          <select id="sort-results">
            <option value="precio">Mejor Precio</option>
            <option value="duracion">Menor Duración</option>
            <option value="salida">Hora de Salida</option>
            <option value="llegada">Hora de Llegada</option>
          </select>
        </div>
      </div>`;
      
      // Si hay vuelo de ida seleccionado, mostrar resumen
      if (this.vueloIdaSeleccionado) {
        const vueloIda = this.vueloIdaSeleccionado;
        headerHTML += `
        <div class="vuelo-ida-resumen" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h4 style="margin: 0; font-size: 1.1rem;">✅ Vuelo de Ida Seleccionado</h4>
            <button class="btn" id="cambiar-vuelo-ida" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 6px 14px; font-size: 0.85rem; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
              🔄 Cambiar
            </button>
          </div>
          <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 8px; backdrop-filter: blur(10px);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <span style="font-size: 1.1rem; font-weight: 700;">${vueloIda.numero_vuelo}</span>
              <span style="opacity: 0.9; font-size: 0.95rem;">${vueloIda.aerolinea}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 1rem; margin-bottom: 10px;">
              <span style="font-weight: 600;">${vueloIda.origen}</span>
              <span style="opacity: 0.8;">→</span>
              <span style="font-weight: 600;">${vueloIda.destino}</span>
            </div>
            <div style="display: flex; gap: 20px; font-size: 0.9rem;">
              <div style="opacity: 0.95;">
                <span>🕐 ${vueloIda.hora_salida} - ${vueloIda.hora_llegada}</span>
              </div>
              <div style="opacity: 0.95;">
                <span>📅 ${new Date(vueloIda.fecha).toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                })}</span>
              </div>
            </div>
          </div>
        </div>`;
      }

      container.innerHTML = headerHTML + `
      <div class="vuelos-list">
        ${vuelos.map(v => {
          const duracionHoras = Math.floor(v.duracion_minutos / 60);
          const duracionMinutos = v.duracion_minutos % 60;
          const asientosColor = v.asientos_disponibles < 5 ? 'danger' : v.asientos_disponibles < 10 ? 'warning' : 'success';
          
          // Convertir precio a número (puede venir como string del backend)
          const precioNum = typeof v.precio === 'string' ? parseFloat(v.precio) : v.precio;
          const precioTotal = precioNum * parseInt(numPasajeros as string);
          
          // Determinar el texto del botón según el contexto
          let botonTexto = 'Reservar Ahora →';
          let botonClase = 'btn btn-primary btn-reserve';
          
          if (esIdaYVuelta && !this.vueloIdaSeleccionado) {
            // Primera etapa: seleccionar vuelo de ida
            botonTexto = 'Seleccionar Vuelo de Ida →';
            botonClase = 'btn btn-primary btn-seleccionar-ida';
          } else if (esIdaYVuelta && this.vueloIdaSeleccionado) {
            // Segunda etapa: seleccionar vuelo de vuelta
            botonTexto = 'Seleccionar Vuelo de Vuelta →';
            botonClase = 'btn btn-primary btn-reserve';
          }
          
          return `
          <div class="vuelo-card-enhanced">
            <div class="vuelo-airline">
              <div class="airline-logo">
                <span class="airline-icon">✈️</span>
              </div>
              <div class="airline-info">
                <h4>${v.aerolinea}</h4>
                <p class="flight-number">${v.numero_vuelo}</p>
              </div>
            </div>

            <div class="vuelo-route">
              <div class="route-point">
                <div class="route-time">${v.hora_salida}</div>
                <div class="route-location">${v.origen}</div>
                <div class="route-date">${new Date(v.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
              </div>

              <div class="route-duration">
                <div class="duration-line"></div>
                <div class="duration-info">
                  <span class="duration-text">${duracionHoras}h ${duracionMinutos}m</span>
                  <span class="flight-type">Directo</span>
                </div>
              </div>

              <div class="route-point">
                <div class="route-time">${v.hora_llegada}</div>
                <div class="route-location">${v.destino}</div>
                <div class="route-date">${new Date(v.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
              </div>
            </div>

            <div class="vuelo-details">
              <div class="detail-item">
                <span class="detail-icon">💺</span>
                <span class="detail-text">Clase: <strong>${v.clase}</strong></span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">🎒</span>
                <span class="detail-text">Equipaje incluido</span>
              </div>
              <div class="detail-item ${asientosColor}">
                <span class="detail-icon">👥</span>
                <span class="detail-text">${v.asientos_disponibles} asientos disponibles</span>
              </div>
            </div>

            <div class="vuelo-pricing">
              <div class="price-breakdown">
                <div class="price-per-person">
                  <span class="price-label">Precio por persona</span>
                  <span class="price-amount">$${precioNum.toFixed(2)}</span>
                </div>
                ${parseInt(numPasajeros as string) > 1 ? `
                  <div class="price-total">
                    <span class="price-label">Total (${numPasajeros} pasajeros)</span>
                    <span class="price-amount-total">$${precioTotal.toFixed(2)}</span>
                  </div>
                ` : ''}
              </div>
              <button class="${botonClase}" data-vuelo='${JSON.stringify(v)}'>
                ${botonTexto}
              </button>
              <button class="btn btn-secondary btn-info-vuelo" data-numero="${v.numero_vuelo}" data-fecha="${v.fecha}">
                ℹ️ Ver Información
              </button>
            </div>
          </div>
        `}).join('')}
      </div>
    `;

    // Ordenamiento de resultados
    document.getElementById('sort-results')?.addEventListener('change', (e) => {
      const sortBy = (e.target as HTMLSelectElement).value;
      const vuelosSorted = [...vuelos].sort((a, b) => {
        switch (sortBy) {
          case 'precio': 
            const precioA = typeof a.precio === 'string' ? parseFloat(a.precio) : a.precio;
            const precioB = typeof b.precio === 'string' ? parseFloat(b.precio) : b.precio;
            return precioA - precioB;
          case 'duracion': return a.duracion_minutos - b.duracion_minutos;
          case 'salida': return a.hora_salida.localeCompare(b.hora_salida);
          case 'llegada': return a.hora_llegada.localeCompare(b.hora_llegada);
          default: return 0;
        }
      });
      this.renderVuelosResults(vuelosSorted, formData);
    });

    // Attach reserve buttons
    container.querySelectorAll('.btn-reserve').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const vueloData = JSON.parse(target.dataset.vuelo || '{}');
        this.numPasajeros = numPasajeros as string; // Guardar número de pasajeros
        
        // Si hay vuelo de ida seleccionado, crear reserva con ambos vuelos
        if (this.vueloIdaSeleccionado) {
          this.crearReservaIdaYVuelta(this.vueloIdaSeleccionado, vueloData);
        } else {
          this.navigate('reservar', vueloData);
        }
      });
    });
    
    // Attach botones de seleccionar vuelo de ida
    container.querySelectorAll('.btn-seleccionar-ida').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const vueloData = JSON.parse(target.dataset.vuelo || '{}');
        
        // Guardar vuelo de ida y parámetros originales
        this.vueloIdaSeleccionado = vueloData;
        this.parametrosBusquedaOriginal = formData;
        
        notify.show('✅ Vuelo de ida seleccionado. Buscando vuelos de regreso...', 'info', 2000);
        
        // Buscar vuelos de regreso (invertir origen y destino)
        const fechaRegreso = formData?.get('fecha_regreso') as string;
        const origen = formData?.get('ciudad_origen_id') as string;
        const destino = formData?.get('ciudad_destino_id') as string;
        
        const busquedaRegreso: any = {
          origen: destino,  // Invertir
          destino: origen,   // Invertir
          fecha: fechaRegreso,
          clase: formData?.get('clase') as string,
          aerolinea_codigo: formData?.get('aerolinea') as string || undefined
        };
        
        // Aplicar filtros opcionales
        const horarioSalida = formData?.get('horario_salida') as string;
        if (horarioSalida && horarioSalida !== 'all') {
          busquedaRegreso.horario_salida = horarioSalida;
        }
        
        const precioMaximoStr = formData?.get('precio_max') as string;
        if (precioMaximoStr && precioMaximoStr.trim() !== '') {
          const precioMax = parseFloat(precioMaximoStr);
          if (!isNaN(precioMax) && precioMax > 0) {
            busquedaRegreso.precio_maximo = precioMax;
          }
        }
        
        const escalas = formData?.get('escalas') as string;
        busquedaRegreso.solo_directos = escalas === 'direct';
        
        try {
          const searchType = (document.querySelector('input[name="search_type"]:checked') as HTMLInputElement)?.value || 'tarifas';
          const response = searchType === 'horarios' 
            ? await vuelosAPI.buscarPorHorarios(busquedaRegreso)
            : await vuelosAPI.buscarPorTarifas(busquedaRegreso);
          
          this.renderVuelosResults(response.data, formData, true);
          
          if (response.data.length > 0) {
            notify.show(`✅ Se encontraron ${response.data.length} vuelo(s) de regreso`, 'success');
          } else {
            notify.show('ℹ️ No se encontraron vuelos de regreso. Intente con otras fechas', 'info');
          }
        } catch (error) {
          console.error('Error buscando vuelos de regreso:', error);
          notify.show('Error al buscar vuelos de regreso', 'error');
        }
      });
    });
    
    // Botón para cambiar vuelo de ida
    const btnCambiarIda = document.getElementById('cambiar-vuelo-ida');
    if (btnCambiarIda) {
      btnCambiarIda.addEventListener('click', () => {
        this.vueloIdaSeleccionado = null;
        notify.show('🔄 Buscando vuelos de ida nuevamente...', 'info');
        
        // Re-buscar vuelos de ida
        const origen = this.parametrosBusquedaOriginal?.get('ciudad_origen_id') as string;
        const destino = this.parametrosBusquedaOriginal?.get('ciudad_destino_id') as string;
        const fecha = this.parametrosBusquedaOriginal?.get('fecha_salida') as string;
        
        const busquedaIda: any = {
          origen,
          destino,
          fecha,
          clase: this.parametrosBusquedaOriginal?.get('clase') as string,
          aerolinea_codigo: this.parametrosBusquedaOriginal?.get('aerolinea') as string || undefined
        };
        
        const searchType = (document.querySelector('input[name="search_type"]:checked') as HTMLInputElement)?.value || 'tarifas';
        const buscarFn = searchType === 'horarios' ? vuelosAPI.buscarPorHorarios : vuelosAPI.buscarPorTarifas;
        
        buscarFn(busquedaIda).then(response => {
          this.renderVuelosResults(response.data, this.parametrosBusquedaOriginal, true);
        }).catch(error => {
          console.error('Error:', error);
          notify.show('Error al buscar vuelos', 'error');
        });
      });
    }

    // Attach info buttons
    container.querySelectorAll('.btn-info-vuelo').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const numeroVuelo = target.dataset.numero;
        const fecha = target.dataset.fecha;
        await this.showFlightInfo(numeroVuelo!, fecha);
      });
    });

    // Scroll suave a resultados
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    console.log('✅ Renderizado completado exitosamente');
    
    } catch (error) {
      console.error('❌ ERROR EN RENDER:', error);
      const container = document.getElementById('resultados-vuelos')!;
      container.innerHTML = '<div class="error-state"><p>Error al mostrar vuelos</p></div>';
      throw error; // Re-lanzar el error para que lo capture el catch externo
    }
  }

  async showFlightInfo(numeroVuelo: string, fecha?: string) {
    try {
      notify.show('🔍 Consultando información del vuelo...', 'info', 1500);
      
      const response = await vuelosAPI.getInformacionVuelo(numeroVuelo, fecha);
      const info = response.data;
      
      // Crear modal
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content modal-info-vuelo">
          <div class="modal-header">
            <h3>✈️ Información del Vuelo ${numeroVuelo}</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Aerolínea:</span>
                <span class="info-value">${info.vuelo.aerolinea}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Ruta:</span>
                <span class="info-value">${info.vuelo.origen} → ${info.vuelo.destino}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Salida:</span>
                <span class="info-value">${info.vuelo.hora_salida}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Llegada:</span>
                <span class="info-value">${info.vuelo.hora_llegada}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Duración:</span>
                <span class="info-value">${Math.floor(info.vuelo.duracion_minutos / 60)}h ${info.vuelo.duracion_minutos % 60}m</span>
              </div>
              <div class="info-item">
                <span class="info-label">Estado:</span>
                <span class="info-value">${info.vuelo.activo ? '✅ Activo' : '❌ Inactivo'}</span>
              </div>
            </div>
            
            ${info.tarifas && info.tarifas.length > 0 ? `
              <div class="info-section">
                <h4>💰 Tarifas Disponibles</h4>
                <div class="tarifas-list">
                  ${info.tarifas.map((t: any) => `
                    <div class="tarifa-item">
                      <span class="tarifa-clase">${t.clase}</span>
                      <span class="tarifa-precio">$${parseFloat(t.precio).toFixed(2)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${info.instancia ? `
              <div class="info-section">
                <h4>📅 Información del ${fecha}</h4>
                <div class="asientos-disponibles">
                  <div class="asiento-clase">
                    <span>Económica:</span>
                    <strong>${info.instancia.asientos_disponibles_economica} asientos</strong>
                  </div>
                  <div class="asiento-clase">
                    <span>Ejecutiva:</span>
                    <strong>${info.instancia.asientos_disponibles_ejecutiva} asientos</strong>
                  </div>
                  <div class="asiento-clase">
                    <span>Primera Clase:</span>
                    <strong>${info.instancia.asientos_disponibles_primera} asientos</strong>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Cerrar modal
      const closeModal = () => {
        modal.remove();
      };
      
      modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      
    } catch (error) {
      console.error('Error al obtener información del vuelo:', error);
      notify.show('❌ Error al consultar información del vuelo', 'error');
    }
  }

  async loadReservas() {
    const container = document.getElementById('lista-reservas')!;
    const emptyState = document.getElementById('empty-reservas');
    const countElement = document.getElementById('count-reservas');
    
    try {
      const response = await reservasAPI.listar();
      const reservas = response.data;
      
      // Actualizar contador
      if (countElement) countElement.textContent = reservas.length.toString();
      
      if (reservas.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }
      
      container.style.display = 'grid';
      if (emptyState) emptyState.style.display = 'none';
      this.renderReservasList(reservas);
    } catch (error) {
      container.innerHTML = '<div class="loading-spinner">Error al cargar reservas</div>';
      if (countElement) countElement.textContent = '0';
    }
  }

  renderReservasList(reservas: Reserva[]) {
    const container = document.getElementById('lista-reservas')!;
    
    console.log('📋 Renderizando reservas:', reservas);

    container.innerHTML = reservas.map(r => {
      const total = typeof r.total === 'string' ? parseFloat(r.total) : r.total;
      return `
      <div class="reserva-card">
        <div class="reserva-header">
          <h3>Reserva ${r.codigo_reserva}</h3>
          <span class="status-badge status-${r.estado.toLowerCase()}">${r.estado}</span>
        </div>
        <div class="reserva-body">
          <p><strong>Fecha:</strong> ${new Date(r.fecha_reserva).toLocaleDateString()}</p>
          <p><strong>Total:</strong> $${total.toFixed(2)}</p>
          <p><strong>Pasajeros:</strong> ${r.detalles.length}</p>
        </div>
        ${r.estado === 'PENDIENTE' ? `
          <div class="reserva-actions">
            <button class="btn btn-primary btn-pagar" data-reserva='${JSON.stringify(r)}'>
              💳 Pagar Ahora
            </button>
            <button class="btn btn-danger btn-cancel" data-codigo="${r.codigo_reserva}">Cancelar</button>
          </div>
        ` : r.estado === 'CONFIRMADA' ? `
          <div class="reserva-actions">
            <button class="btn btn-success" disabled>✓ Pagada</button>
            <button class="btn btn-danger btn-cancel" data-codigo="${r.codigo_reserva}">Cancelar Reserva</button>
          </div>
        ` : ''}
      </div>
    `}).join('');

    // Attach pagar buttons
    container.querySelectorAll('.btn-pagar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const reservaData = JSON.parse(target.dataset.reserva || '{}');
        
        // Guardar reserva en window para acceso en la página de pago
        (window as any).reservasPendientes = [reservaData];
        
        // Navegar a la página de pago
        this.navigate('pagar');
      });
    });

    // Attach cancel buttons
    container.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const codigo = target.dataset.codigo!;
        
        ConfirmModal.show({
          title: 'Cancelar Reserva',
          message: '¿Estás seguro de que deseas cancelar esta reserva?',
          details: `Código de reserva: ${codigo}. Esta acción no se puede deshacer.`,
          confirmText: 'Sí, Cancelar',
          cancelText: 'No, Mantener',
          type: 'danger',
          onConfirm: async () => {
            try {
              await reservasAPI.cancelar(codigo);
              notify.show('Reserva cancelada exitosamente', 'success');
              // Animación: desvanecer y colapsar la tarjeta de reserva
              try {
                // Buscar el card más cercano al botón que abrió el modal
                const card = document.querySelector(`.reserva-card .btn-cancel[data-codigo="${codigo}"]`)?.closest('.reserva-card') as HTMLElement | null;
                if (card) {
                  // Aplicar clase de fade y luego colapsar la altura para efecto suave
                  card.classList.add('fade-out');

                  // Capturar altura actual y forzar un reflow
                  const startHeight = card.offsetHeight;
                  card.style.height = startHeight + 'px';
                  // Forzar reflow
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  card.offsetHeight;

                  // Añadir clase collapsing para transición de altura
                  card.classList.add('collapsing');
                  // Después de un pequeño delay, poner altura a 0 para animar
                  setTimeout(() => {
                    card.style.height = '0px';
                    card.style.margin = '0px';
                    card.style.padding = '0px';
                  }, 40);

                  // Remover el elemento tras la duración de la animación
                  setTimeout(() => {
                    card.remove();
                  }, 500);
                } else {
                  // Si no encontramos el elemento, recargar la lista como fallback
                  this.loadReservas();
                }
              } catch (err) {
                // En caso de cualquier fallo, recargar la lista
                this.loadReservas();
              }
            } catch (error) {
              notify.show('Error al cancelar reserva', 'error');
            }
          }
        });
      });
    });
  }

  async loadBilletes() {
    const container = document.getElementById('lista-billetes')!;
    const emptyState = document.getElementById('empty-billetes');
    const countElement = document.getElementById('count-billetes');
    
    try {
      const response = await pagosAPI.listarBilletes();
      const billetes = response.data;
      
      // Actualizar contador
      if (countElement) countElement.textContent = billetes.length.toString();
      
      if (billetes.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }
      
      container.style.display = 'grid';
      if (emptyState) emptyState.style.display = 'none';
      this.renderBilletesList(billetes);
    } catch (error) {
      container.innerHTML = '<div class="loading-spinner">Error al cargar billetes</div>';
      if (countElement) countElement.textContent = '0';
    }
  }

  renderBilletesList(billetes: Billete[]) {
    const container = document.getElementById('lista-billetes')!;

    container.innerHTML = billetes.map(b => {
      const puedeCheckin = this.puedeHacerCheckIn(b);
      return `
      <div class="billete-card" data-codigo="${b.codigo_billete}">
        <div class="billete-header-card">
          <div class="billete-codigo">${b.codigo_billete}</div>
          <div class="billete-estado">${b.estado === 'EMITIDO' ? '✓ Activo' : b.estado}</div>
        </div>
        
        <div class="billete-vuelo-info">
          <div class="billete-detalles">
            <div class="billete-detalle-item">
              <span>� Pasajero</span>
              <span>${b.pasajero}</span>
            </div>
            <div class="billete-detalle-item">
              <span>�📧 Método de entrega</span>
              <span>${b.metodo_entrega === 'EMAIL' ? 'Correo Electrónico' : 'Aeropuerto'}</span>
            </div>
            <div class="billete-detalle-item">
              <span>📅 Fecha de emisión</span>
              <span>${new Date(b.fecha_emision).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div class="billete-actions" style="margin-top: 16px; display: flex; gap: 8px;">
          <button class="btn btn-primary btn-small btn-ver-detalle" data-codigo="${b.codigo_billete}" style="flex: 1;">
            👁️ Ver Detalles
          </button>
          ${puedeCheckin.puede ? `
            <button class="btn btn-success btn-small btn-check-in" data-codigo="${b.codigo_billete}" style="flex: 1;">
              ✓ Check-in
            </button>
          ` : ''}
        </div>
      </div>
    `;
    }).join('');

    // Event listeners para ver detalles
    container.querySelectorAll('.btn-ver-detalle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const codigo = (e.target as HTMLElement).dataset.codigo;
        if (codigo) {
          await this.verDetalleBillete(codigo);
        }
      });
    });

    // Event listeners para check-in
    container.querySelectorAll('.btn-check-in').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const codigo = (e.target as HTMLElement).dataset.codigo;
        if (codigo) {
          await this.hacerCheckIn(codigo);
        }
      });
    });
  }

  puedeHacerCheckIn(billete: Billete): { puede: boolean; mensaje?: string } {
    // Solo billetes emitidos pueden hacer check-in
    if (billete.estado !== 'EMITIDO') {
      return { puede: false, mensaje: 'El billete debe estar en estado EMITIDO' };
    }

    // Verificar si tiene detalles de reserva con información del vuelo
    // Esto es una verificación básica - la validación de 24-3h se hace en el backend
    return { puede: true };
  }

  async hacerCheckIn(codigoBillete: string) {
    // Mostrar modal de confirmación profesional
    const confirmModalHtml = `
      <div class="modal-overlay" id="confirm-checkin-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.3s;">
        <div class="modal-content" style="max-width: 450px; width: 90%; background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); animation: slideUp 0.3s;">
          <div style="padding: 32px; text-align: center;">
            <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px;">
              ✈️
            </div>
            <h2 style="font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 12px 0;">¿Realizar Check-in?</h2>
            <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
              ¿Desea realizar el check-in para este vuelo? Esta acción confirmará su asistencia al vuelo.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button class="btn-cancelar-checkin" style="flex: 1; padding: 14px 24px; background: #f1f5f9; color: #475569; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                Cancelar
              </button>
              <button class="btn-aceptar-checkin" style="flex: 1; padding: 14px 24px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        .btn-cancelar-checkin:hover {
          background: #e2e8f0 !important;
        }
        .btn-aceptar-checkin:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4) !important;
        }
      </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', confirmModalHtml);
    
    const confirmModal = document.getElementById('confirm-checkin-modal')!;
    const btnCancelar = confirmModal.querySelector('.btn-cancelar-checkin')!;
    const btnAceptar = confirmModal.querySelector('.btn-aceptar-checkin')!;
    
    // Manejar cancelar
    btnCancelar.addEventListener('click', () => {
      confirmModal.remove();
    });
    
    // Manejar aceptar
    btnAceptar.addEventListener('click', async () => {
      confirmModal.remove();
      
      try {
        notify.show('Procesando check-in...', 'info', 2000);
        const response = await reservasAPI.hacerCheckIn(codigoBillete);
        const data = response.data;
      
      // Mostrar modal de confirmación profesional
      const modalHtml = `
        <div class="modal-overlay" id="checkin-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.3s;">
          <div class="modal-content" style="max-width: 550px; width: 90%; background: white; border-radius: 24px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); animation: slideUp 0.4s;">
            
            <!-- Cabecera con checkmark animado -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 32px; text-align: center; border-radius: 24px 24px 0 0; position: relative;">
              <div style="width: 80px; height: 80px; background: white; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); animation: scaleIn 0.5s 0.2s both;">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2 style="color: white; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">¡Check-in Confirmado!</h2>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 15px; margin: 0;">Tu pase de abordar está listo</p>
              <button class="modal-close" style="position: absolute; top: 16px; right: 16px; background: rgba(255, 255, 255, 0.2); border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 24px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">&times;</button>
            </div>
            
            <div style="padding: 32px;">
              <!-- Información del Vuelo -->
              <div style="background: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 2px dashed #e2e8f0;">
                  <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                    ✈️
                  </div>
                  <div style="flex: 1;">
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">Número de Vuelo</div>
                    <div style="font-size: 20px; font-weight: 700; color: #1e293b;">${data.vuelo.numero}</div>
                  </div>
                </div>
                
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #64748b; font-size: 14px;">📋 Billete</span>
                    <span style="font-weight: 600; font-family: monospace; color: #1e293b; font-size: 15px;">${data.billete_codigo}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #64748b; font-size: 14px;">📅 Fecha</span>
                    <span style="font-weight: 600; color: #1e293b;">${new Date(data.vuelo.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #64748b; font-size: 14px;">🕐 Hora de Salida</span>
                    <span style="font-weight: 600; color: #1e293b; font-size: 18px;">${data.vuelo.hora_salida}</span>
                  </div>
                  ${data.asiento ? `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #dbeafe; padding: 8px 12px; border-radius: 8px; margin-top: 4px;">
                    <span style="color: #1e40af; font-size: 14px; font-weight: 600;">💺 Asiento</span>
                    <span style="font-weight: 700; color: #1e40af; font-size: 20px;">${data.asiento}</span>
                  </div>
                  ` : ''}
                  ${data.puerta ? `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #dcfce7; padding: 8px 12px; border-radius: 8px;">
                    <span style="color: #166534; font-size: 14px; font-weight: 600;">🚪 Puerta de Embarque</span>
                    <span style="font-weight: 700; color: #166534; font-size: 20px;">${data.puerta}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <!-- Aviso importante -->
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <div style="display: flex; gap: 12px; align-items: start;">
                  <div style="font-size: 20px; margin-top: 2px;">⚠️</div>
                  <div style="flex: 1;">
                    <div style="font-weight: 600; color: #92400e; margin-bottom: 4px; font-size: 14px;">Recordatorio Importante</div>
                    <div style="color: #78350f; font-size: 13px; line-height: 1.5;">
                      Llegue al aeropuerto con <strong>al menos 2 horas de anticipación</strong>. Presente su documento de identidad en el mostrador de check-in.
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Botón de acción -->
              <button class="btn-cerrar-modal" style="width: 100%; padding: 16px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                Entendido, Continuar
              </button>
            </div>
          </div>
        </div>
        
        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
          }
          .modal-close:hover {
            background: rgba(255, 255, 255, 0.3) !important;
            transform: rotate(90deg);
          }
          .btn-cerrar-modal:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
          }
        </style>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Cerrar modal
      const modal = document.getElementById('checkin-modal')!;
      const btnCerrar = modal.querySelector('.btn-cerrar-modal')!;
      const btnClose = modal.querySelector('.modal-close')!;
      
      btnCerrar.addEventListener('click', () => modal.remove());
      btnClose.addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
      
      // Recargar lista de billetes
      await this.loadBilletes();
      
      } catch (error: any) {
        const mensaje = error.response?.data?.detail || 'Error al realizar check-in';
        notify.show(mensaje, 'error');
      }
    });
  }

  async verDetalleBillete(codigo: string) {
    try {
      notify.show('Cargando detalles del billete...', 'info', 2000);
      const response = await pagosAPI.obtenerBillete(codigo);
      const detalle = response.data;
      
      // Crear modal con los detalles
      const modalHtml = `
        <div class="modal-overlay" id="billete-modal">
          <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
              <h3>🎫 Detalles del Billete</h3>
              <button class="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 24px;">
              <!-- Código del Billete -->
              <div style="text-align: center; margin-bottom: 24px; padding: 16px; background: #f0f9ff; border-radius: 12px;">
                <div style="font-size: 24px; font-weight: 700; color: #3b82f6; font-family: monospace;">
                  ${detalle.billete.codigo}
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Código de Billete</div>
              </div>

              <!-- Información del Vuelo -->
              <div style="background: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">✈️ Información del Vuelo</h4>
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748b;">Vuelo:</span>
                    <span style="font-weight: 600;">${detalle.vuelo.numero_vuelo}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748b;">Aerolínea:</span>
                    <span style="font-weight: 600;">${detalle.vuelo.aerolinea}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748b;">Ruta:</span>
                    <span style="font-weight: 600;">${detalle.vuelo.origen} → ${detalle.vuelo.destino}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748b;">Fecha:</span>
                    <span style="font-weight: 600;">${new Date(detalle.vuelo.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748b;">Salida:</span>
                    <span style="font-weight: 600;">${detalle.vuelo.hora_salida}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748b;">Llegada:</span>
                    <span style="font-weight: 600;">${detalle.vuelo.hora_llegada}</span>
                  </div>
                  ${detalle.vuelo.puerta ? `
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #64748b;">Puerta:</span>
                      <span style="font-weight: 600; color: #3b82f6;">${detalle.vuelo.puerta}</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Información del Pasajero -->
              <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <h4 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">� Pasajero</h4>
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
                  <div style="display: grid; gap: 12px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #64748b;">Nombre:</span>
                      <span style="font-weight: 600;">${detalle.pasajero.nombre} ${detalle.pasajero.apellido}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #64748b;">Clase:</span>
                      <span style="font-weight: 600;">${detalle.asiento.clase}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #64748b;">Asiento:</span>
                      <span style="font-weight: 600; color: #3b82f6;">${detalle.asiento.numero}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Información Adicional -->
              <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <div style="display: grid; gap: 8px; font-size: 13px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>Código de Reserva:</span>
                    <span style="font-weight: 600; font-family: monospace;">${detalle.reserva_codigo}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>Precio:</span>
                    <span style="font-weight: 600;">$${detalle.precio.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>Estado:</span>
                    <span style="font-weight: 600; color: #059669;">${detalle.billete.estado}</span>
                  </div>
                </div>
              </div>

              <!-- Instrucciones -->
              <div style="background: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 12px; color: #475569;">
                <strong>⚠️ Importante:</strong> Llega al aeropuerto con al menos 2 horas de anticipación. 
                Presenta este código de billete y tu documento de identidad en el mostrador de check-in.
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Event listener para cerrar modal
      const modal = document.getElementById('billete-modal');
      const closeBtn = modal?.querySelector('.modal-close');
      
      closeBtn?.addEventListener('click', () => modal?.remove());
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Error al cargar detalles del billete';
      notify.show(errorMessage, 'error');
    }
  }

  attachPerfilEvents() {
    document.getElementById('perfil-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const nombre = formData.get('nombre') as string;
      const apellido = formData.get('apellido') as string;
      const telefono = formData.get('telefono') as string;
      
      // Validaciones
      const nombreValidation = Validator.name(nombre);
      const apellidoValidation = Validator.name(apellido);
      const telefonoValidation = Validator.phone(telefono);
      
      if (!nombreValidation.valid || !apellidoValidation.valid || !telefonoValidation.valid) {
        notify.show('Por favor, corrija los errores en el formulario', 'error');
        return;
      }
      
      try {
        const response = await authAPI.actualizarPerfil({
          nombre,
          apellido,
          email: formData.get('email') as string,
          telefono
        });
        this.setUser(response.data);
        notify.show('Perfil actualizado correctamente', 'success');
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Error al actualizar perfil';
        notify.show(errorMessage, 'error');
      }
    });

    // Cancelar edición
    document.getElementById('cancel-perfil')?.addEventListener('click', () => {
      this.render();
    });

    // Formulario de cambio de contraseña
    document.getElementById('password-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const currentPassword = formData.get('current_password') as string;
      const newPassword = formData.get('new_password') as string;
      const confirmPassword = formData.get('confirm_password') as string;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        notify.show('Por favor, complete todos los campos', 'error');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        notify.show('Las contraseñas no coinciden', 'error');
        return;
      }
      
      const passwordValidation = Validator.password(newPassword);
      if (!passwordValidation.valid) {
        notify.show(passwordValidation.message, 'error');
        return;
      }
      
      try {
        await authAPI.cambiarPassword(currentPassword, newPassword);
        notify.show('✅ Contraseña actualizada correctamente', 'success');
        form.reset();
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Error al cambiar contraseña';
        notify.show(errorMessage, 'error');
      }
    });

    // Formulario de preferencias
    document.getElementById('preferences-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      notify.show('Preferencias guardadas correctamente', 'success');
    });
  }

  attachBilletesEvents() {
    // Filtro de billetes
    document.getElementById('filter-billetes')?.addEventListener('change', (e) => {
      const filter = (e.target as HTMLSelectElement).value;
      this.filtrarBilletes(filter, '');
    });

    // Búsqueda de billetes
    document.getElementById('search-billetes')?.addEventListener('input', (e) => {
      const search = (e.target as HTMLInputElement).value;
      const filter = (document.getElementById('filter-billetes') as HTMLSelectElement)?.value || 'todos';
      this.filtrarBilletes(filter, search);
    });
  }

  filtrarBilletes(filter: string, search: string) {
    const container = document.getElementById('lista-billetes');
    if (!container) return;

    const billeteCards = container.querySelectorAll('.billete-card');
    let visibleCount = 0;

    billeteCards.forEach(card => {
      const element = card as HTMLElement;
      const fechaVuelo = element.dataset.fecha || '';
      const numeroVuelo = element.dataset.numeroVuelo?.toLowerCase() || '';
      const searchLower = search.toLowerCase();

      // Verificar filtro de fecha
      let pasaFiltro = true;
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaVueloDate = new Date(fechaVuelo);
      fechaVueloDate.setHours(0, 0, 0, 0);

      if (filter === 'proximos') {
        pasaFiltro = fechaVueloDate >= hoy;
      } else if (filter === 'pasados') {
        pasaFiltro = fechaVueloDate < hoy;
      }

      // Verificar búsqueda
      const pasaBusqueda = search === '' || numeroVuelo.includes(searchLower);

      // Mostrar u ocultar
      if (pasaFiltro && pasaBusqueda) {
        element.style.display = '';
        visibleCount++;
      } else {
        element.style.display = 'none';
      }
    });

    // Actualizar contador
    const countElement = document.getElementById('count-billetes');
    if (countElement) {
      countElement.textContent = visibleCount.toString();
    }

    // Mostrar empty state si no hay resultados
    const emptyState = document.getElementById('empty-billetes');
    if (emptyState) {
      if (visibleCount === 0 && billeteCards.length > 0) {
        emptyState.style.display = 'flex';
        emptyState.querySelector('.empty-title')!.textContent = 'No se encontraron billetes';
        emptyState.querySelector('.empty-text')!.textContent = search 
          ? 'Intenta con otro término de búsqueda'
          : 'No hay billetes para este filtro';
      } else if (billeteCards.length === 0) {
        emptyState.style.display = 'flex';
      } else {
        emptyState.style.display = 'none';
      }
    }
  }

  loadPerfilStats() {
    // Cargar estadísticas del perfil
    const totalVuelos = document.getElementById('total-vuelos');
    const totalReservas = document.getElementById('total-reservas');
    
    if (totalVuelos) totalVuelos.textContent = '0';
    if (totalReservas) totalReservas.textContent = '0';
  }

  attachReservaEvents() {
    // Generar formulario de pasajeros (simplificado - 1 pasajero para el usuario)
    const container = document.getElementById('pasajeros-container')!;
    container.innerHTML = `
      <p>La reserva se creará a nombre de: <strong>${this.currentUser?.nombre} ${this.currentUser?.apellido}</strong></p>
    `;

    // Cargar mapa de asientos
    this.cargarMapaAsientos();

    document.getElementById('reserva-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!this.selectedFlight) {
        notify.show('No hay vuelo seleccionado', 'error');
        return;
      }

      // Verificar si es ida y vuelta o un solo vuelo
      const esIdaYVuelta = (this.selectedFlight as any).esIdaYVuelta === true;
      const vuelos = esIdaYVuelta ? (this.selectedFlight as any).vuelos : [this.selectedFlight];
      
      // Validar que todos los vuelos tengan instancia_vuelo_id
      for (const vuelo of vuelos) {
        if (!vuelo.instancia_vuelo_id) {
          notify.show('Uno de los vuelos no tiene instancia disponible para la fecha seleccionada', 'error');
          return;
        }
      }

      const numPasajerosRequeridos = parseInt(this.numPasajeros || '1');
      
      // Obtener asientos seleccionados según el tipo de viaje
      let asientosIda: string[] = [];
      let asientosVuelta: string[] = [];
      
      if (esIdaYVuelta) {
        // Para ida y vuelta, obtener asientos de cada contenedor
        const containerIda = document.getElementById('mapa-asientos-ida-container');
        const containerVuelta = document.getElementById('mapa-asientos-vuelta-container');
        
        if (containerIda) {
          asientosIda = Array.from(containerIda.querySelectorAll('.seat-btn.selected'))
            .map(btn => (btn as HTMLElement).dataset.seatNumber)
            .filter(Boolean) as string[];
        }
        
        if (containerVuelta) {
          asientosVuelta = Array.from(containerVuelta.querySelectorAll('.seat-btn.selected'))
            .map(btn => (btn as HTMLElement).dataset.seatNumber)
            .filter(Boolean) as string[];
        }
        
        // Validar asientos de ida
        if (asientosIda.length === 0) {
          notify.show('Por favor seleccione asiento(s) para el vuelo de ida', 'error');
          return;
        }
        if (asientosIda.length !== numPasajerosRequeridos) {
          notify.show(`Debe seleccionar ${numPasajerosRequeridos} asiento(s) para el vuelo de ida`, 'error');
          return;
        }
        
        // Validar asientos de vuelta
        if (asientosVuelta.length === 0) {
          notify.show('Por favor seleccione asiento(s) para el vuelo de regreso', 'error');
          return;
        }
        if (asientosVuelta.length !== numPasajerosRequeridos) {
          notify.show(`Debe seleccionar ${numPasajerosRequeridos} asiento(s) para el vuelo de regreso`, 'error');
          return;
        }
      } else {
        // Para un solo vuelo
        const asientosSeleccionados = Array.from(document.querySelectorAll('.seat-btn.selected'))
          .map(btn => (btn as HTMLElement).dataset.seatNumber)
          .filter(Boolean) as string[];
        
        if (asientosSeleccionados.length === 0) {
          notify.show('Por favor seleccione al menos un asiento', 'error');
          return;
        }
        
        if (asientosSeleccionados.length !== numPasajerosRequeridos) {
          notify.show(`Debe seleccionar ${numPasajerosRequeridos} asiento(s) para ${numPasajerosRequeridos} pasajero(s)`, 'error');
          return;
        }
        
        asientosIda = asientosSeleccionados;
      }

      try {
        notify.show('Procesando reserva...', 'info', 2000);
        
        // Crear detalles para cada vuelo con sus respectivos asientos
        const detalles = esIdaYVuelta ? [
          // Vuelo de ida
          {
            instancia_vuelo_id: vuelos[0].instancia_vuelo_id,
            pasajeros: asientosIda.map(asiento => ({
              nombre: this.currentUser!.nombre,
              apellido: this.currentUser!.apellido,
              asiento_numero: asiento
            })),
            clase: vuelos[0].clase
          },
          // Vuelo de vuelta
          {
            instancia_vuelo_id: vuelos[1].instancia_vuelo_id,
            pasajeros: asientosVuelta.map(asiento => ({
              nombre: this.currentUser!.nombre,
              apellido: this.currentUser!.apellido,
              asiento_numero: asiento
            })),
            clase: vuelos[1].clase
          }
        ] : [
          // Un solo vuelo
          {
            instancia_vuelo_id: vuelos[0].instancia_vuelo_id,
            pasajeros: asientosIda.map(asiento => ({
              nombre: this.currentUser!.nombre,
              apellido: this.currentUser!.apellido,
              asiento_numero: asiento
            })),
            clase: vuelos[0].clase
          }
        ];
        
        const response = await reservasAPI.crear({
          detalles: detalles
        });

        const mensajeExito = esIdaYVuelta 
          ? `¡Reserva de ida y vuelta creada exitosamente! Código: ${response.data.codigo_reserva}`
          : `¡Reserva creada exitosamente! Código: ${response.data.codigo_reserva}`;
        
        notify.show(mensajeExito, 'success', 6000);
        setTimeout(() => {
          this.navigate('reservas');
        }, 1500);
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Error al crear reserva';
        notify.show(errorMessage, 'error');
      }
    });
  }

  async cargarMapaAsientos() {
    if (!this.selectedFlight) return;

    // Verificar si es ida y vuelta
    const esIdaYVuelta = (this.selectedFlight as any).esIdaYVuelta === true;
    
    if (esIdaYVuelta) {
      // Cargar mapas para ambos vuelos
      const vuelos = (this.selectedFlight as any).vuelos;
      await this.cargarMapaAsientosVuelo(vuelos[0], 'ida');
      await this.cargarMapaAsientosVuelo(vuelos[1], 'vuelta');
    } else {
      // Cargar mapa para un solo vuelo
      const container = document.getElementById('mapa-asientos-container');
      if (!container) return;
      
      try {
        const response = await vuelosAPI.obtenerMapaAsientos(
          this.selectedFlight.vuelo_id!,
          this.selectedFlight.fecha,
          this.selectedFlight.clase
        );
        
        const data = response.data;
        this.renderMapaAsientos(data.asientos, data.resumen, 'container');
        
      } catch (error) {
        container.innerHTML = '<div style="color: #ef4444; padding: 12px;">Error al cargar mapa de asientos</div>';
      }
    }
  }

  async cargarMapaAsientosVuelo(vuelo: any, tipo: 'ida' | 'vuelta') {
    const containerId = tipo === 'ida' ? 'mapa-asientos-ida-container' : 'mapa-asientos-vuelta-container';
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const response = await vuelosAPI.obtenerMapaAsientos(
        vuelo.vuelo_id!,
        vuelo.fecha,
        vuelo.clase
      );
      
      const data = response.data;
      this.renderMapaAsientos(data.asientos, data.resumen, tipo);
      
    } catch (error) {
      container.innerHTML = '<div style="color: #ef4444; padding: 12px;">Error al cargar mapa de asientos</div>';
    }
  }

  renderMapaAsientos(asientos: any[], resumen: any, tipo: 'ida' | 'vuelta' | 'container' = 'container') {
    const containerId = tipo === 'ida' 
      ? 'mapa-asientos-ida-container' 
      : tipo === 'vuelta' 
        ? 'mapa-asientos-vuelta-container' 
        : 'mapa-asientos-container';
    
    const container = document.getElementById(containerId);
    if (!container) return;

    // Agrupar asientos por fila (primer dígito del número)
    const asientosPorFila: { [key: string]: any[] } = {};
    asientos.forEach(asiento => {
      const fila = asiento.numero_asiento.match(/\d+/)?.[0] || '1';
      if (!asientosPorFila[fila]) {
        asientosPorFila[fila] = [];
      }
      asientosPorFila[fila].push(asiento);
    });

    const filas = Object.keys(asientosPorFila).sort((a, b) => parseInt(a) - parseInt(b));

    let html = `
      <div class="seats-legend" style="display: flex; gap: 16px; margin-bottom: 16px; font-size: 14px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 24px; height: 24px; background: #22c55e; border-radius: 4px;"></div>
          <span>Disponible</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 24px; height: 24px; background: #94a3b8; border-radius: 4px;"></div>
          <span>Ocupado</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 24px; height: 24px; background: #3b82f6; border: 2px solid #1d4ed8; border-radius: 4px;"></div>
          <span>Seleccionado</span>
        </div>
      </div>
      
      <div class="seats-info" style="text-align: center; margin-bottom: 16px;">
        <div style="color: #64748b; margin-bottom: 4px;">
          ${resumen.disponibles} de ${resumen.total} asientos disponibles
        </div>
        <div style="color: #3b82f6; font-weight: 600;">
          Seleccione ${this.numPasajeros} asiento(s)
        </div>
      </div>
      
      <div class="seats-grid" style="display: flex; flex-direction: column; gap: 8px; max-width: 400px; margin: 0 auto;">
    `;

    filas.forEach(fila => {
      const asientosFila = asientosPorFila[fila].sort((a, b) => 
        a.numero_asiento.localeCompare(b.numero_asiento)
      );

      html += `
        <div class="seat-row" style="display: flex; gap: 4px; align-items: center;">
          <span class="row-number" style="width: 30px; text-align: center; font-weight: 600; color: #64748b;">${fila}</span>
          <div style="display: flex; gap: 4px; flex: 1; justify-content: center;">
      `;

      asientosFila.forEach((asiento, idx) => {
        const disponible = asiento.disponible;
        const bgColor = disponible ? '#22c55e' : '#94a3b8';
        const cursor = disponible ? 'pointer' : 'not-allowed';
        const disabled = disponible ? '' : 'disabled';
        
        // Agregar espacio entre C y D para simular pasillo
        if (idx === 3) {
          html += '<div style="width: 24px;"></div>';
        }

        html += `
          <button 
            class="seat-btn ${disabled ? 'disabled' : ''}" 
            data-seat-number="${asiento.numero_asiento}"
            data-seat-class="${asiento.clase}"
            data-seat-type="${tipo}"
            style="
              width: 40px; 
              height: 40px; 
              background: ${bgColor}; 
              border: none; 
              border-radius: 6px; 
              color: white; 
              font-weight: 600; 
              font-size: 12px;
              cursor: ${cursor};
              transition: all 0.2s;
            "
            ${disabled}
          >
            ${asiento.numero_asiento.match(/[A-F]/)?.[0] || '?'}
          </button>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Event listeners para selección
    const maxSeleccion = parseInt(this.numPasajeros || '1');
    const asientoInfoId = tipo === 'ida' 
      ? 'asiento-info-ida' 
      : tipo === 'vuelta' 
        ? 'asiento-info-vuelta' 
        : 'asiento-info';
    const asientoNumeroId = tipo === 'ida' 
      ? 'asiento-numero-ida' 
      : tipo === 'vuelta' 
        ? 'asiento-numero-vuelta' 
        : 'asiento-numero';
    
    container.querySelectorAll('.seat-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        
        // Contar asientos ya seleccionados en este contenedor específico
        const seleccionados = container.querySelectorAll('.seat-btn.selected');
        const yaSeleccionado = target.classList.contains('selected');
        
        if (yaSeleccionado) {
          // Deseleccionar
          target.style.background = '#22c55e';
          target.style.border = 'none';
          target.classList.remove('selected');
        } else {
          // Verificar si se puede seleccionar más
          if (seleccionados.length >= maxSeleccion) {
            notify.show(`Solo puedes seleccionar ${maxSeleccion} asiento(s) para ${maxSeleccion} pasajero(s)`, 'warning');
            return;
          }
          
          // Seleccionar
          target.style.background = '#3b82f6';
          target.style.border = '2px solid #1d4ed8';
          target.classList.add('selected');
        }
        
        // Actualizar info de asientos seleccionados
        const asientosSeleccionados = Array.from(container.querySelectorAll('.seat-btn.selected'))
          .map(btn => (btn as HTMLElement).dataset.seatNumber)
          .join(', ');
        
        const asientoInfo = document.getElementById(asientoInfoId);
        const asientoNumero = document.getElementById(asientoNumeroId);
        if (asientoInfo && asientoNumero) {
          if (asientosSeleccionados) {
            asientoInfo.style.display = 'block';
            asientoNumero.textContent = asientosSeleccionados;
          } else {
            asientoInfo.style.display = 'none';
          }
        }
      });
    });
  }

  async loadTarjetas() {
    try {
      const response = await pagosAPI.listarTarjetas();
      const tarjetas = response.data;
      
      const container = document.getElementById('saved-cards-section');
      if (!container) return;

      if (tarjetas.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #64748b;">
            <p>No tienes tarjetas guardadas</p>
            <button class="nueva-tarjeta-btn" id="btn-mostrar-nueva-tarjeta" style="margin-top: 12px;">
              ➕ Agregar Nueva Tarjeta
            </button>
          </div>
        `;
        
        document.getElementById('btn-mostrar-nueva-tarjeta')?.addEventListener('click', () => {
          document.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
          document.querySelector('[data-payment-method="new"]')?.classList.add('active');
          document.getElementById('saved-cards-section')!.style.display = 'none';
          document.getElementById('new-card-section')!.style.display = 'block';
        });
        
        return;
      }

      container.innerHTML = tarjetas.map((tarjeta: any) => {
        const lastFour = tarjeta.numero_tarjeta.slice(-4);
        const masked = `•••• •••• •••• ${lastFour}`;
        
        return `
          <div class="card-option" data-card-id="${tarjeta.id}">
            <input type="radio" name="tarjeta" value="${tarjeta.id}" id="card-${tarjeta.id}" />
            <div class="card-info">
              <div class="card-icon">${tarjeta.tipo}</div>
              <div class="card-details">
                <div class="card-number">${masked}</div>
                <div class="card-holder">${tarjeta.nombre_titular}</div>
              </div>
            </div>
            <button class="card-delete" data-delete-id="${tarjeta.id}">🗑️ Eliminar</button>
          </div>
        `;
      }).join('');

      // Seleccionar la primera tarjeta por defecto
      const firstRadio = container.querySelector('input[type="radio"]') as HTMLInputElement;
      if (firstRadio) {
        firstRadio.checked = true;
        firstRadio.closest('.card-option')?.classList.add('selected');
        document.getElementById('btn-procesar-pago')!.removeAttribute('disabled');
      }

      // Event listeners para selección de tarjeta
      container.querySelectorAll('.card-option').forEach(option => {
        option.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).classList.contains('card-delete')) return;
          
          const radio = option.querySelector('input[type="radio"]') as HTMLInputElement;
          radio.checked = true;
          
          container.querySelectorAll('.card-option').forEach(o => o.classList.remove('selected'));
          option.classList.add('selected');
          
          document.getElementById('btn-procesar-pago')!.removeAttribute('disabled');
        });
      });

      // Event listeners para eliminar tarjeta
      container.querySelectorAll('.card-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tarjetaId = parseInt((e.target as HTMLElement).dataset.deleteId || '0');
          const cardElement = (e.target as HTMLElement).closest('.card-option');
          const cardNumber = cardElement?.querySelector('.card-number')?.textContent || 'esta tarjeta';
          
          ConfirmModal.show({
            title: 'Eliminar Tarjeta',
            message: '¿Estás seguro de que deseas eliminar esta tarjeta?',
            details: `Tarjeta: ${cardNumber}. No podrás recuperar esta información después.`,
            confirmText: 'Sí, Eliminar',
            cancelText: 'Cancelar',
            type: 'danger',
            onConfirm: async () => {
              try {
                await pagosAPI.eliminarTarjeta(tarjetaId);
                notify.show('Tarjeta eliminada correctamente', 'success');
                this.loadTarjetas();
              } catch (error) {
                notify.show('Error al eliminar tarjeta', 'error');
              }
            }
          });
        });
      });
      
    } catch (error) {
      console.error('Error cargando tarjetas:', error);
      const container = document.getElementById('saved-cards-section');
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #ef4444;">
            Error al cargar tarjetas
          </div>
        `;
      }
    }
  }

  attachPagoEvents() {
    // Tabs de método de pago
    document.querySelectorAll('.payment-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const method = target.dataset.paymentMethod;
        
        document.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
        target.classList.add('active');
        
        if (method === 'saved') {
          document.getElementById('saved-cards-section')!.style.display = 'block';
          document.getElementById('new-card-section')!.style.display = 'none';
          
          // Habilitar botón si hay tarjeta seleccionada
          const hasSelected = document.querySelector('.card-option.selected');
          if (hasSelected) {
            document.getElementById('btn-procesar-pago')!.removeAttribute('disabled');
          } else {
            document.getElementById('btn-procesar-pago')!.setAttribute('disabled', 'true');
          }
        } else {
          document.getElementById('saved-cards-section')!.style.display = 'none';
          document.getElementById('new-card-section')!.style.display = 'block';
          document.getElementById('btn-procesar-pago')!.removeAttribute('disabled');
        }
      });
    });

    // Formateo de número de tarjeta
    const cardNumberInput = document.getElementById('card-number') as HTMLInputElement;
    cardNumberInput?.addEventListener('input', (e) => {
      let value = (e.target as HTMLInputElement).value.replace(/\s/g, '');
      value = value.replace(/\D/g, '');
      value = value.substring(0, 16);
      value = value.replace(/(\d{4})/g, '$1 ').trim();
      (e.target as HTMLInputElement).value = value;
    });

    // Formateo de fecha de expiración
    const cardExpiryInput = document.getElementById('card-expiry') as HTMLInputElement;
    cardExpiryInput?.addEventListener('input', (e) => {
      let value = (e.target as HTMLInputElement).value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 6);
      }
      (e.target as HTMLInputElement).value = value;
    });

    // Formateo de CVV
    const cardCvvInput = document.getElementById('card-cvv') as HTMLInputElement;
    cardCvvInput?.addEventListener('input', (e) => {
      let value = (e.target as HTMLInputElement).value.replace(/\D/g, '');
      value = value.substring(0, 4);
      (e.target as HTMLInputElement).value = value;
    });

    // Opciones de entrega
    document.querySelectorAll('.entrega-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.entrega-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        const radio = option.querySelector('input[type="radio"]') as HTMLInputElement;
        radio.checked = true;
      });
    });

    // Procesar pago
    document.getElementById('btn-procesar-pago')?.addEventListener('click', async () => {
      const reservasPendientes = (window as any).reservasPendientes || [];
      if (reservasPendientes.length === 0) {
        notify.show('No hay reservas pendientes', 'error');
        return;
      }

      const reserva = reservasPendientes[0];
      const activeTab = document.querySelector('.payment-tab.active')?.getAttribute('data-payment-method');
      const metodoEntrega = (document.querySelector('.entrega-option.selected input') as HTMLInputElement)?.value || 'EMAIL';

      let tarjetaId: number | null = null;

      try {
        if (activeTab === 'saved') {
          // Usar tarjeta guardada
          const selectedCard = document.querySelector('.card-option.selected input') as HTMLInputElement;
          if (!selectedCard) {
            notify.show('Por favor, selecciona una tarjeta', 'error');
            return;
          }
          tarjetaId = parseInt(selectedCard.value);
          
        } else {
          // Nueva tarjeta
          const numero = (document.getElementById('card-number') as HTMLInputElement)?.value.replace(/\s/g, '');
          const titular = (document.getElementById('card-holder') as HTMLInputElement)?.value;
          const expiracion = (document.getElementById('card-expiry') as HTMLInputElement)?.value;
          const cvv = (document.getElementById('card-cvv') as HTMLInputElement)?.value;
          const tipo = (document.getElementById('card-type') as HTMLSelectElement)?.value;
          const guardar = (document.getElementById('save-card') as HTMLInputElement)?.checked;

          // Validaciones básicas
          if (!numero || numero.length !== 16) {
            notify.show('Número de tarjeta inválido', 'error');
            return;
          }
          if (!titular || titular.trim().length < 3) {
            notify.show('Nombre del titular inválido', 'error');
            return;
          }
          if (!expiracion || expiracion.length !== 7) {
            notify.show('Fecha de expiración inválida (MM/AAAA)', 'error');
            return;
          }
          if (!cvv || cvv.length < 3) {
            notify.show('CVV inválido', 'error');
            return;
          }

          // Guardar tarjeta si está marcado o temporalmente para el pago
          const tarjetaResponse = await pagosAPI.agregarTarjeta({
            numero_tarjeta: numero,
            nombre_titular: titular.toUpperCase(),
            fecha_expiracion: expiracion,
            cvv: cvv,
            tipo: tipo
          });

          tarjetaId = tarjetaResponse.data.id!;

          if (!guardar) {
            // Nota: En una implementación real, eliminaríamos la tarjeta después del pago
            // Por ahora la dejamos guardada
          }
        }

        if (!tarjetaId) {
          notify.show('Error al procesar la tarjeta', 'error');
          return;
        }

        // Procesar pago
        notify.show('Procesando pago...', 'info', 3000);
        
        await pagosAPI.procesarPago({
          reserva_id: reserva.id,
          tarjeta_id: tarjetaId,
          metodo_entrega: metodoEntrega
        });

        notify.show('¡Pago procesado exitosamente! 🎉', 'success', 5000);
        
        // Limpiar reservas pendientes
        (window as any).reservasPendientes = [];
        
        // Redirigir a billetes después de 2 segundos
        setTimeout(() => {
          this.navigate('billetes');
        }, 2000);

      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Error al procesar el pago';
        notify.show(errorMessage, 'error');
      }
    });
  }

  // ==================== NOTIFICACIONES ====================

  attachNotificacionesEvents() {
    const btnNotif = document.getElementById('btn-notificaciones');
    const dropdown = document.getElementById('notif-dropdown');
    
    btnNotif?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown) {
        const isVisible = dropdown.style.display !== 'none';
        dropdown.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
          this.cargarNotificaciones();
        }
      }
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (dropdown && !target.closest('.notifications-container')) {
        dropdown.style.display = 'none';
      }
    });

    // Marcar todas como leídas
    document.getElementById('btn-marcar-todas')?.addEventListener('click', async () => {
      try {
        await notificacionesAPI.marcarTodasLeidas();
        this.cargarNotificaciones();
        this.cargarContadorNotificaciones();
        notify.show('Todas las notificaciones marcadas como leídas', 'success', 2000);
      } catch (error) {
        notify.show('Error al marcar notificaciones', 'error');
      }
    });
  }

  async cargarContadorNotificaciones() {
    try {
      const response = await notificacionesAPI.contador();
      const count = response.data.no_leidas;
      
      const badge = document.getElementById('notif-badge');
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count.toString();
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Error cargando contador de notificaciones:', error);
    }
  }

  async cargarNotificaciones() {
    const listContainer = document.getElementById('notif-list');
    if (!listContainer) return;

    try {
      listContainer.innerHTML = '<div class="loading-spinner" style="padding: 20px;">Cargando...</div>';
      
      const response = await notificacionesAPI.listar(false, 10);
      const data = response.data;
      const notificaciones = data.notificaciones;

      if (notificaciones.length === 0) {
        listContainer.innerHTML = `
          <div class="notif-empty" style="padding: 30px; text-align: center; color: #94a3b8;">
            <div style="font-size: 48px; margin-bottom: 12px;">🔔</div>
            <p>No tienes notificaciones</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = notificaciones.map((notif: any) => {
        const iconos: { [key: string]: string } = {
          'CAMBIO_VUELO': '✈️',
          'RECORDATORIO': '⏰',
          'OFERTA': '🎁',
          'CONFIRMACION': '✅',
          'ALERTA': '⚠️'
        };
        
        const icon = iconos[notif.tipo] || '📋';
        const fecha = new Date(notif.fecha_creacion).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });

        return `
          <div class="notif-item ${notif.leido ? 'leida' : 'no-leida'}" data-notif-id="${notif.id}">
            <div class="notif-icon">${icon}</div>
            <div class="notif-content">
              <div class="notif-title">${notif.titulo}</div>
              <div class="notif-mensaje">${notif.mensaje}</div>
              <div class="notif-fecha">${fecha}</div>
            </div>
            ${!notif.leido ? '<div class="notif-dot"></div>' : ''}
          </div>
        `;
      }).join('');

      // Event listeners para marcar como leída al hacer clic
      listContainer.querySelectorAll('.notif-item.no-leida').forEach(item => {
        item.addEventListener('click', async () => {
          const notifId = parseInt((item as HTMLElement).dataset.notifId || '0');
          if (notifId) {
            try {
              await notificacionesAPI.marcarLeida(notifId);
              item.classList.remove('no-leida');
              item.classList.add('leida');
              item.querySelector('.notif-dot')?.remove();
              this.cargarContadorNotificaciones();
            } catch (error) {
              console.error('Error marcando notificación como leída');
            }
          }
        });
      });

    } catch (error) {
      listContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #ef4444;">
          Error al cargar notificaciones
        </div>
      `;
    }
  }

  iniciarPollingNotificaciones() {
    // Polling cada 30 segundos
    setInterval(() => {
      this.cargarContadorNotificaciones();
    }, 30000);
  }
}

// Inicializar aplicación
const app = new AppState();
app.render();
