# Sistema de Pagos Escolares 🎓

Sistema web multi-tenant para gestión de pagos escolares, estudiantes y apoderados.

## 📋 Características

### Para Administradores
- **Gestión de Estudiantes**: Alta, baja y modificación de estudiantes
- **Importación Masiva**: Carga de estudiantes desde archivos Excel
- **Gestión de Apoderados**: Administración completa de apoderados (padres/tutores)
- **Reportes Financieros**:
  - Reporte de morosos (solo periodo escolar: Feb-Nov)
  - Reporte de pagos por apoderado
  - Búsqueda con autocompletado
- **Validación de Pagos**: Aprobación/rechazo de solicitudes de pago
- **Dashboard Administrativo**: Vista completa de estadísticas y métricas

### Para Apoderados
- **Registro de Pagos**: Subida de comprobantes con integración Cloudinary
- **Historial de Pagos**: Visualización de pagos realizados y pendientes
- **Estados de Solicitudes**: Seguimiento de aprobaciones/rechazos
- **Dashboard Personal**: Vista de estudiantes asociados y estado financiero

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Cloud Storage**: Cloudinary (comprobantes de pago)
- **Autenticación**: Supabase Auth con RLS (Row Level Security)
- **Notificaciones**: SweetAlert2

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

## 🚀 Instalación

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

#### Opción A: Servidor Local
```bash
# Con Python
python -m http.server 8000

# Con Node.js
npx http-server -p 8000
```

#### Opción B: Hosting Estático
- **Vercel**: `vercel deploy`
- **Netlify**: Arrastrar carpeta al dashboard
- **GitHub Pages**: Configurar en Settings → Pages

## 👥 Usuarios y Roles

El sistema maneja dos tipos de usuarios:

### Administrador
- Rol: `admin`
- Permisos: Acceso completo al sistema
- Gestión de estudiantes, apoderados y pagos

### Apoderado (Padre/Tutor)
- Rol: `padre`
- Permisos: Ver sus estudiantes y registrar pagos
- Consultar historial y estados

## 📊 Modelo de Datos

### Tablas Principales

- **usuarios**: Información de autenticación y perfil
- **apoderados**: Datos de padres/tutores
- **estudiantes**: Información de estudiantes
- **tarifas**: Tarifas mensuales por nivel educativo
- **pagos**: Registro de pagos realizados
- **solicitudes_pago**: Solicitudes pendientes de validación

## 🔐 Seguridad

- **Row Level Security (RLS)**: Implementado en todas las tablas
- **Políticas de Acceso**: Los apoderados solo ven sus propios datos
- **Validación de Archivos**: Cloudinary maneja la validación de imágenes
- **Auth Tokens**: Manejo seguro de sesiones con Supabase Auth

## 📅 Lógica de Periodo Escolar

El sistema boliviano maneja un año escolar especial:
- **Periodo Activo**: Febrero - Noviembre
- **Periodo Inactivo**: Diciembre - Enero

Durante el periodo inactivo:
- No se evalúan morosos
- Se muestra mensaje informativo en reportes
- Los pagos se siguen registrando normalmente

## 🎨 Características de UI/UX

- ✅ Diseño responsive (mobile-first)
- ✅ Notificaciones con SweetAlert2
- ✅ Búsqueda con autocompletado
- ✅ Validación en tiempo real
- ✅ Carga de archivos drag & drop
- ✅ Feedback visual en todas las operaciones

## 📝 Importación de Estudiantes

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

## 🐛 Troubleshooting

### Error: "Failed to fetch"
- Verificar configuración de Supabase en `supabase-credentials.js`
- Revisar CORS en Supabase Dashboard

### Comprobantes no se suben
- Verificar configuración de Cloudinary
- Verificar que el Upload Preset esté configurado como "unsigned"

### Reportes vacíos
- Verificar políticas RLS en Supabase
- Revisar consola del navegador para errores

## 📞 Soporte

Para reportar problemas o solicitar funcionalidades:
1. Crear un issue en el repositorio
2. Incluir screenshots si es posible
3. Detallar pasos para reproducir el problema

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

---

Desarrollado con ❤️ para instituciones educativas bolivianas
