# Sistema de Pagos Escolares 🎓

**Sistema web integral para la gestión de pagos escolares, estudiantes y apoderados.**

Este proyecto resuelve de manera profesional y segura la administración de cobros, control de estudiantes y la interacción transparente entre la institución educativa y los padres de familia. Incluye dashboards diferenciados, flujos de validación, reportes y una experiencia de usuario moderna y responsiva.

---

## 🏗️ Arquitectura General

- **Frontend:** HTML5, CSS3 (moderno, mobile-first), JavaScript Vanilla
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Almacenamiento de archivos:** Cloudinary (comprobantes de pago)
- **Notificaciones y feedback:** SweetAlert2
- **Despliegue:** Vercel

---

## 📋 Funcionalidades Principales

### 👨‍💼 Administrador / Secretario
- Gestión integral de estudiantes (alta, baja, edición, importación masiva desde Excel)
- Agregar estudiantes individualmente (para alumnos que ingresan a mitad de año)
- Desasignar estudiantes mal vinculados a un apoderado
- Administración de apoderados (padres/tutores)
- Validación de pagos: revisión de comprobantes, aprobación/rechazo con motivo
- Reportes financieros: morosidad, pagos por periodo, exportación a Excel
- Dashboard con métricas clave, gráficos y estadísticas en tiempo real
- Control de tarifas anuales por nivel (Primaria / Secundaria) y actualización dinámica

### 👨‍👩‍👧‍👦 Apoderado (Padre/Tutor)
- Registro sencillo y seguro con validación visual
- Asociación de hijos mediante códigos únicos entregados por el colegio
- Agregar nuevos hijos desde el panel sin necesidad de volver a registrarse
- Subida de comprobantes de pago individuales o grupales
- Selección automática del monto según nivel del hijo (Primaria o Secundaria)
- Visualización de historial de pagos y estados (pendiente, aprobado, rechazado)
- Dashboard personal con resumen financiero y detalle por hijo

---

## 🛠️ Tecnologías y Herramientas

- **Frontend:** HTML5, CSS3, JavaScript Vanilla (mobile-first)
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Cloud Storage:** Cloudinary (comprobantes de pago, optimización automática de imágenes)
- **Notificaciones:** SweetAlert2
- **Control de versiones:** Git / GitHub
- **Despliegue:** Vercel

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
│       └── logo.svg
├── css/
│   ├── styles.css
│   ├── login.css
│   ├── dashboard.css
│   └── mobile-enhancements.css
├── js/
│   ├── auth.js
│   ├── admin.js
│   ├── padre.js
│   ├── registro.js
│   ├── validaciones.js
│   ├── cloudinary.js
│   ├── estudiantes-import.js
│   ├── supabase-config.js
│   ├── supabase-credentials.js
│   ├── config-loader.js
│   └── theme-selector.js
├── database/
│   └── schema.sql
└── .env.example
```

---

## 🚀 Instalación y Despliegue

### 1. Configurar Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Ejecutar el script SQL:
   ```sql
   database/schema.sql
   ```
3. Habilitar Email/Password en Authentication → Providers

### 2. Configurar Cloudinary

1. Crear cuenta en [Cloudinary](https://cloudinary.com)
2. Obtener Cloud Name y Upload Preset (unsigned)

### 3. Configurar el Proyecto

```bash
git clone <url-del-repositorio>
cd sistema-pagos-escolares
cp .env.example js/supabase-credentials.js
```

Editar `js/supabase-credentials.js`:
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

### 4. Desplegar en Vercel

```bash
git add .
git commit -m "deploy"
git push
```
Vercel detecta el push automáticamente y despliega en 1-2 minutos.

---

## 👥 Usuarios y Roles

| Rol | Acceso | Identificación |
|-----|--------|----------------|
| Administrador | Panel completo | Email: `colegio1@gmail.com` |
| Apoderado | Panel de padre | Teléfono o email registrado |

---

## 📊 Modelo de Datos

| Tabla | Descripción |
|-------|-------------|
| `apoderados` | Datos de padres/tutores |
| `estudiantes` | Información de estudiantes con código único |
| `tarifas` | Tarifas mensuales por nivel y año |
| `pagos` | Registro de comprobantes de pago |
| `solicitudes` | Solicitudes del sistema |

---

## 🔐 Seguridad

- **RLS activo** en todas las tablas
- Cada apoderado solo ve sus propios datos
- Solo el admin puede aprobar/rechazar pagos y modificar tarifas
- Imágenes optimizadas automáticamente antes de subir a Cloudinary (máx 1500px, compresión 85% JPEG)
- Sesiones manejadas con JWT de Supabase Auth

---

## 📅 Periodo Escolar Bolivia

- **Activo:** Febrero - Noviembre
- **Inactivo:** Diciembre - Enero
- Durante el periodo inactivo no se evalúan morosos pero los pagos siguen registrándose

---

---

# 📘 GUÍA DE USO PARA ADMINISTRADOR / SECRETARIO

---

## 1️⃣ Configurar Tarifas al Inicio del Año

Antes de cualquier otra acción, el admin debe configurar las tarifas del año escolar.

1. Ingresar al panel admin con `colegio1@gmail.com`
2. Ir a la sección **Tarifas**
3. Ingresar el monto mensual para **Primaria** y **Secundaria** por separado
4. Hacer clic en **Actualizar Tarifas**

> ⚠️ El sistema recalcula automáticamente el total mensual de todos los apoderados al actualizar las tarifas.

---

## 2️⃣ Importar Estudiantes desde Excel (Carga Masiva)

### Paso 1 — Preparar el archivo Excel

El sistema acepta Excel exportado desde el **Sistema de Información Educativa (SIE)** del Ministerio de Educación u otro formato, siempre que contenga estas columnas con estos nombres exactos:

| Columna | Nombre exacto | Obligatorio | Ejemplo |
|---------|--------------|-------------|---------|
| 1 | `Nombre Completo` o `nombre_completo` | ✅ Sí | AREBALO AGUILAR JIMENA |
| 2 | `nivel` o `Nivel` | ✅ Sí | Primaria o Secundaria |
| 3 | `grado` o `Grado` | ❌ No | 4° |
| 4 | `paralelo` o `Paralelo` | ❌ No | A |

> ℹ️ El sistema **ignora automáticamente** columnas adicionales como Carnet, Código Rude, Género, Fecha de Nacimiento, etc.

> ⚠️ La columna `nivel` NO existe en el Excel del Ministerio — debe agregarla manualmente con el valor `Primaria` o `Secundaria` en toda la columna según corresponda al curso.

### Paso 2 — Agregar la columna "nivel" al Excel del Ministerio

Cuando convierte el PDF del Ministerio a Excel:

1. Abrir el Excel convertido
2. Insertar una nueva columna llamada `nivel`
3. Escribir `Secundaria` o `Primaria` en todas las filas según el curso
4. Guardar el archivo

### Paso 3 — Importar en el sistema

1. Ir a la sección **Estudiantes** en el panel admin
2. Hacer clic en **Importar desde Excel**
3. El sistema mostrará una advertencia: **"¿Es un archivo nuevo?"** — confirmar solo si el archivo no fue importado antes
4. Seleccionar el archivo Excel
5. Si el sistema detecta posibles duplicados mostrará una lista y preguntará si omitirlos
6. Confirmar la importación
7. El sistema genera códigos automáticos (0001, 0002...) para cada estudiante

> ⚠️ **IMPORTANTE:** Nunca importar el mismo archivo dos veces. El sistema detecta duplicados por nombre + nivel + grado pero no es infalible si los nombres tienen diferencias de escritura.

---

## 3️⃣ Agregar un Estudiante Individual

Para estudiantes que ingresan a mitad de año:

1. Ir a la sección **Estudiantes**
2. Hacer clic en **➕ Agregar Estudiante**
3. Completar el formulario:
   - Nombre completo
   - Nivel (Primaria / Secundaria)
   - Grado (opcional)
   - Paralelo (opcional)
4. El código se genera automáticamente
5. Confirmar

---

## 4️⃣ Entregar Códigos a los Padres

Después de importar o agregar estudiantes:

1. Ir a la sección **Estudiantes**
2. Hacer clic en **Descargar PDF de Códigos**
3. El PDF lista todos los estudiantes con su código único de 4 dígitos
4. Entregar a cada padre el código correspondiente a su hijo

> El código es el "token" que el padre usa para vincular a su hijo durante el registro. Es único e intransferible. Si el padre lo pierde, el admin puede buscarlo en la sección Estudiantes por nombre.

---

## 5️⃣ Gestionar Pagos

### Aprobar un pago
1. Ir a la sección **Pagos**
2. Ver los comprobantes pendientes
3. Hacer clic en **Ver Comprobante** para abrir la imagen del depósito bancario
4. Verificar que el monto del comprobante coincida con la tarifa vigente según el nivel del hijo
5. Si coincide → **✓ Aprobar**
6. Si no coincide → **✗ Rechazar** (escribir el motivo)

### Cálculo del monto esperado
El monto que debe coincidir depende de cuántos hijos y de qué nivel incluye el comprobante:

```
Ejemplo:
- 2 hijos de Primaria  (Bs 15 c/u) = Bs 30
- 1 hijo de Secundaria (Bs 20 c/u) = Bs 20
- Total comprobante esperado        = Bs 50
```

> El padre selecciona qué hijos incluye en cada comprobante al momento de subirlo. El sistema calcula el monto automáticamente.

---

## 6️⃣ Desasignar un Estudiante (Corrección de Error)

Si un padre vinculó por error al hijo equivocado:

1. Ir a la sección **Estudiantes**
2. Buscar al estudiante mal asignado por nombre o código
3. Hacer clic en el estudiante para ver el detalle
4. Hacer clic en **🔓 Desasignar Estudiante**
5. Confirmar
6. El estudiante queda disponible para que el padre correcto lo reclame con su código

---

## 7️⃣ Generar Reportes

| Reporte | Descripción |
|---------|-------------|
| Estudiantes por nivel | Lista filtrada por Primaria, Secundaria, disponibles o asignados |
| Pagos del mes | Todos los pagos del mes actual |
| Pagos del año | Todos los pagos del año escolar 2026 |
| Morosos | Apoderados con meses vencidos sin pagar |
| Reporte individual | Detalle financiero completo de un apoderado específico |
| Exportar Excel | Exporta estudiantes, apoderados o pagos a .xlsx |

> Todos los reportes tienen botón de impresión y están optimizados para móvil y escritorio.

---

## 8️⃣ Preguntas Frecuentes del Admin

**¿Qué hago si un padre dice que no puede registrarse?**
Verificar en Estudiantes que el código de su hijo esté en estado `Disponible`. Si está `Asignado`, usar la opción Desasignar y comunicarle el código correcto.

**¿Qué hago si importé el mismo Excel dos veces?**
El sistema habrá mostrado una advertencia de duplicados. Si se importaron igual, buscar los duplicados en la sección Estudiantes filtrando por nombre y eliminar el registro incorrecto.

**¿Puedo cambiar las tarifas a mitad de año?**
Sí. Al actualizar tarifas el sistema recalcula automáticamente los totales de todos los apoderados activos.

**¿Los comprobantes se almacenan en Supabase?**
No. Las imágenes se almacenan en Cloudinary. Supabase solo guarda la URL. El plan gratuito de Cloudinary soporta aproximadamente 50,000 comprobantes (equivalente a 5 años con 1,000 estudiantes).

**¿Qué pasa si el colegio tiene más de 2 proyectos en Supabase?**
Supabase plan gratuito permite hasta 2 proyectos activos. Si un proyecto lleva más de 7 días sin actividad se pausa automáticamente. Para reactivarlo ingresar a `https://supabase.com/dashboard/project/ID_DEL_PROYECTO` y hacer clic en **Resume project**.

---

## 🐛 Resolución de Problemas

| Problema | Solución |
|----------|----------|
| "Failed to fetch" | Verificar credenciales en `supabase-credentials.js` |
| Comprobante no se sube | Verificar que el Upload Preset de Cloudinary sea `unsigned` |
| Padre no puede vincularse | Verificar que el estudiante esté en estado `disponible` |
| Reportes vacíos | Verificar políticas RLS en Supabase Dashboard |
| Estudiante duplicado | Buscar en Estudiantes y desasignar o eliminar el duplicado |
| Login no responde | El proyecto Supabase puede estar pausado — reactivar desde el dashboard |

---

## 📞 Soporte

Para reportar problemas:
1. Crear un issue en el repositorio de GitHub
2. Incluir capturas de pantalla
3. Detallar los pasos para reproducir el problema

---

**Desarrollado para instituciones educativas bolivianas. Periodo escolar Febrero - Noviembre.**