
# Sistema de Pagos Escolares 🎓

**Sistema web integral para la gestión de pagos escolares, estudiantes y apoderados.**

Este proyecto resuelve de manera profesional y segura la administración de cobros, control de estudiantes y la interacción transparente entre la institución educativa y los padres de familia. Incluye dashboards diferenciados, flujos de validación, reportes y una experiencia de usuario moderna y responsiva.

---

## 🏗️ Arquitectura General

- **Frontend:** HTML5, CSS3 (moderno, mobile-first), JavaScript Vanilla
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Almacenamiento de archivos:** Cloudinary (comprobantes de pago)
- **Notificaciones y feedback:** SweetAlert2
- **Despliegue:** Vercel, Netlify, GitHub Pages o servidor local

---


## 📋 Funcionalidades Principales

### 👨‍💼 Administrador
- Gestión integral de estudiantes (alta, baja, edición, importación masiva desde Excel)
- Administración de apoderados (padres/tutores)
- Validación de pagos: revisión de comprobantes, aprobación/rechazo con motivo
- Reportes financieros avanzados: morosidad, pagos por periodo, exportación a Excel
- Dashboard con métricas clave, gráficos y estadísticas en tiempo real
- Control de tarifas anuales y actualización dinámica

### 👨‍👩‍👧‍👦 Apoderado (Padre/Tutor)
- Registro sencillo y seguro (con validación y feedback visual)
- Asociación de hijos mediante códigos únicos
- Subida de comprobantes de pago (Cloudinary)
- Visualización de historial de pagos y estados (pendiente, aprobado, rechazado)
- Dashboard personal con resumen financiero y detalle por hijo
- Acceso permanente a comprobantes como respaldo

---


## 🛠️ Tecnologías y Herramientas

- **Frontend:** HTML5, CSS3 (con enfoque mobile-first y componentes modernos), JavaScript Vanilla
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Cloud Storage:** Cloudinary (comprobantes de pago)
- **Notificaciones:** SweetAlert2
- **Control de versiones:** Git
- **Despliegue:** Vercel, Netlify, GitHub Pages, servidor local

---


## 📁 Estructura del Proyecto

```
sistema-pagos-escolares/
├── index.html                    # Página de login
├── registro.html                 # Registro de nuevos usuarios
├── dashboard-admin.html          # Panel administrativo
├── dashboard-padre.html          # Panel de apoderados
├── assets/
│   └── images/
│       └── logo.svg             # Logo del sistema
├── css/
│   ├── styles.css               # Estilos globales
│   ├── login.css                # Estilos de login/registro
│   ├── dashboard.css            # Estilos de dashboards
│   └── mobile-enhancements.css  # Responsive design
├── js/
│   ├── auth.js                  # Autenticación y manejo de sesión
│   ├── admin.js                 # Lógica del dashboard admin
│   ├── padre.js                 # Lógica del dashboard padre
│   ├── registro.js              # Lógica de registro
│   ├── validaciones.js          # Validaciones de formularios
│   ├── cloudinary.js            # Integración con Cloudinary
│   ├── estudiantes-import.js    # Importación de estudiantes desde Excel
│   ├── supabase-config.js       # Configuración de Supabase
│   ├── supabase-credentials.js  # Credenciales (gitignored)
│   ├── config-loader.js         # Cargador de configuración
│   └── theme-selector.js        # Selector de temas
├── database/
│   └── schema.sql               # Estructura completa de BD (tablas + RLS + índices)
└── .env.example                 # Ejemplo de variables de entorno
```


## 🚀 Instalación y Despliegue

### 1. Configurar Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Ejecutar el script SQL principal:
   ```sql
   database/schema.sql              -- Estructura completa: tablas, políticas RLS, índices, tarifas
   ```

3. Configurar autenticación:
   - Habilitar Email/Password en Authentication → Providers
   - Configurar Email Templates (opcional)

### 2. Configurar Cloudinary

1. Crear cuenta en [Cloudinary](https://cloudinary.com)
2. Obtener:
   - Cloud Name
   - Upload Preset (unsigned)

### 3. Configurar el Proyecto

1. Clonar el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd sistema-pagos-escolares
   ```

2. Crear archivo de credenciales:
   ```bash
   cp .env.example js/supabase-credentials.js
   ```

3. Editar `js/supabase-credentials.js`:
   ```javascript
   export const SUPABASE_CONFIG = {
       url: 'https://tu-proyecto.supabase.co',
       anonKey: 'tu-anon-key'
   };

   export const CLOUDINARY_CONFIG = {
       cloudName: 'tu-cloud-name',
       uploadPreset: 'tu-upload-preset'
   };
   ```

### 4. Desplegar


#### Despliegue Real del Proyecto

> **Este proyecto fue desplegado y probado en producción usando:**
> - **GitHub** (repositorio y control de versiones)
> - **Vercel** (hosting estático y dominio principal)
> - **Supabase** (backend, base de datos, autenticación y almacenamiento)

Las instrucciones de servidor local (Python/Node.js) son solo opcionales para pruebas y desarrollo, pero el flujo real de despliegue y uso es 100% en la nube con las plataformas mencionadas.


#### ⚠️ Nota sobre Servidor Local

> **Importante:** El servidor local (Python/Node.js) **NO fue utilizado** en el flujo real de desarrollo, despliegue ni validación de este sistema. Solo se deja como referencia para pruebas técnicas o desarrolladores que deseen clonar el proyecto y hacer pruebas rápidas en su máquina.

```bash
# (Opcional, solo para pruebas locales)
# Con Python
python -m http.server 8000

# Con Node.js
npx http-server -p 8000
```


## 👥 Usuarios, Roles y Seguridad

El sistema maneja dos tipos de usuarios:

### Administrador
- Rol: `admin`
- Permisos: Acceso completo al sistema
- Gestión de estudiantes, apoderados y pagos

### Apoderado (Padre/Tutor)
- Rol: `padre`
- Permisos: Ver sus estudiantes y registrar pagos
- Consultar historial y estados


## 📊 Modelo de Datos y Flujos

### Tablas Principales

- **usuarios**: Información de autenticación y perfil
- **apoderados**: Datos de padres/tutores
- **estudiantes**: Información de estudiantes
- **tarifas**: Tarifas mensuales por nivel educativo
- **pagos**: Registro de pagos realizados
- **solicitudes_pago**: Solicitudes pendientes de validación


## 🔐 Seguridad y Buenas Prácticas

- **Row Level Security (RLS)**: Implementado en todas las tablas
- **Políticas de Acceso**: Los apoderados solo ven sus propios datos
- **Validación de Archivos**: Cloudinary maneja la validación de imágenes
- **Auth Tokens**: Manejo seguro de sesiones con Supabase Auth


## 📅 Lógica de Negocio: Periodo Escolar

El sistema boliviano maneja un año escolar especial:
- **Periodo Activo**: Febrero - Noviembre
- **Periodo Inactivo**: Diciembre - Enero

Durante el periodo inactivo:
- No se evalúan morosos
- Se muestra mensaje informativo en reportes
- Los pagos se siguen registrando normalmente


## 🎨 Experiencia de Usuario (UI/UX)

- ✅ Diseño responsive (mobile-first)
- ✅ Notificaciones con SweetAlert2
- ✅ Búsqueda con autocompletado
- ✅ Validación en tiempo real
- ✅ Carga de archivos drag & drop
- ✅ Feedback visual en todas las operaciones


## 📝 Importación Masiva de Estudiantes

El sistema permite importar estudiantes masivamente desde Excel:

### Formato del Archivo
```
| codigo | nombre_completo | nivel_educacion | fecha_nacimiento | carnet_identidad | nombre_apoderado | ci_apoderado | celular_apoderado | email_apoderado |
```

### Niveles Válidos
- Primaria
- Secundaria

### Proceso
1. Admin → Gestión de Estudiantes
2. Click en "Importar Estudiantes"
3. Seleccionar archivo Excel
4. El sistema genera códigos secuenciales automáticamente
5. Validación y carga a la base de datos


## 🐛 Resolución de Problemas (Troubleshooting)

### Error: "Failed to fetch"
- Verificar configuración de Supabase en `supabase-credentials.js`
- Revisar CORS en Supabase Dashboard

### Comprobantes no se suben
- Verificar configuración de Cloudinary
- Verificar que el Upload Preset esté configurado como "unsigned"

### Reportes vacíos
- Verificar políticas RLS en Supabase
- Revisar consola del navegador para errores


## 📞 Soporte y Contacto

Para reportar problemas o solicitar funcionalidades:
1. Crear un issue en el repositorio
2. Incluir screenshots si es posible
3. Detallar pasos para reproducir el problema


## 📄 Licencia y Créditos


Proyecto privado - Todos los derechos reservados

---

**Desarrollado con excelencia profesional para instituciones educativas bolivianas.**
