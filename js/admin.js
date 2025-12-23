// ========================================
// PANEL ADMINISTRATIVO - SUPABASE
// ========================================

import { initSupabase, getSupabase } from './supabase-config.js';

await initSupabase();
const supabase = getSupabase();

// Variables globales
let estudiantesData = [];
let apoderadosData = [];
let pagosData = [];
let tarifasData = null;

// ========================================
// VERIFICAR AUTENTICACIÓN
// ========================================
const { data: { session } } = await supabase.auth.getSession();
if (!session || session.user.email !== 'colegio1@gmail.com') {
    window.location.href = 'index.html';
}

console.log('✅ Admin autenticado:', session.user.email);

// ========================================
// NAVEGACIÓN ENTRE SECCIONES
// ========================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Actualizar menú activo
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Mostrar sección correspondiente
        const seccion = item.dataset.section;
        document.querySelectorAll('.section-content').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`seccion${capitalize(seccion)}`).classList.add('active');
        
        // Cargar datos si es necesario
        if (seccion === 'pagos') cargarPagos();
        if (seccion === 'apoderados') cargarApoderados();
        if (seccion === 'tarifas') cargarTarifas();
        if (seccion === 'estudiantes') cargarTodosEstudiantes();
    });
});

// ========================================
// CERRAR SESIÓN
// ========================================
document.getElementById('btnLogout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// ========================================
// CARGAR ESTADÍSTICAS
// ========================================
async function cargarEstadisticas() {
    try {
        // Contar estudiantes
        const { count: totalEstudiantes } = await supabase
            .from('estudiantes')
            .select('*', { count: 'exact', head: true });
        
        // Contar apoderados activos
        const { count: totalApoderados } = await supabase
            .from('apoderados')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'activo');
        
        // Mes actual del sistema (para calcular pagos del mes)
        const hoy = new Date();
        const mesActualNumero = hoy.getMonth() + 1; // 1-12
        const anioActual = hoy.getFullYear();
        const mesActualStr = `${anioActual}-${String(mesActualNumero).padStart(2, '0')}`; // "2025-12"
        
        const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                             'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        document.getElementById('nombreMesActual').textContent = nombresMeses[mesActualNumero - 1] + ' ' + anioActual;
        
        // 1. Recaudación del mes actual
        const { data: pagosMesActual } = await supabase
            .from('pagos')
            .select('monto')
            .eq('mes', mesActualStr)
            .eq('estado', 'aprobado');
        
        const recaudadoMesActual = pagosMesActual?.reduce((sum, p) => sum + parseFloat(p.monto), 0) || 0;
        
        // 2. Recaudado acumulado (todos los meses del 2026)
        const { data: pagos2026 } = await supabase
            .from('pagos')
            .select('monto')
            .gte('mes', '2026-02')
            .lte('mes', '2026-11')
            .eq('estado', 'aprobado');
        
        const recaudadoAcumulado = pagos2026?.reduce((sum, p) => sum + parseFloat(p.monto), 0) || 0;
        
        // 3. Meta anual (total de todos los apoderados × 10 meses)
        const { data: apoderadosActivos } = await supabase
            .from('apoderados')
            .select('total_mensual')
            .eq('estado', 'activo');
        
        const totalMensualApoderados = apoderadosActivos?.reduce((sum, a) => sum + parseFloat(a.total_mensual || 0), 0) || 0;
        const metaAnual = totalMensualApoderados * 10; // 10 meses (Feb-Nov)
        
        // 4. Tasa de cumplimiento
        const tasaCumplimiento = metaAnual > 0 ? ((recaudadoAcumulado / metaAnual) * 100) : 0;
        
        // 5. Pagos atrasados (apoderados que no pagaron meses anteriores)
        // Determinar meses vencidos (anteriores al actual en el año escolar 2026)
        const mesesEscolares = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', 
                                '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
        const mesesVencidos = mesesEscolares.filter(m => m < mesActualStr && m.startsWith('2026'));
        
        let apoderadosConAtrasos = 0;
        if (mesesVencidos.length > 0 && apoderadosActivos) {
            for (const apoderado of apoderadosActivos) {
                // Verificar si pagó todos los meses vencidos
                const { data: pagosApoderado } = await supabase
                    .from('pagos')
                    .select('mes')
                    .eq('apoderado_id', apoderado.id)
                    .in('mes', mesesVencidos)
                    .eq('estado', 'aprobado');
                
                if (!pagosApoderado || pagosApoderado.length < mesesVencidos.length) {
                    apoderadosConAtrasos++;
                }
            }
        }
        
        // 6. Pendientes del mes actual (apoderados que no pagaron el mes actual)
        let pendientesMesActual = 0;
        if (mesActualStr >= '2026-02' && mesActualStr <= '2026-11' && apoderadosActivos) {
            const { data: pagosMesActualTodos } = await supabase
                .from('pagos')
                .select('apoderado_id')
                .eq('mes', mesActualStr)
                .eq('estado', 'aprobado');
            
            const apoderadosQuePagaron = new Set(pagosMesActualTodos?.map(p => p.apoderado_id) || []);
            pendientesMesActual = apoderadosActivos.length - apoderadosQuePagaron.size;
        }
        
        // Actualizar UI
        document.getElementById('recaudadoMesActual').textContent = `Bs ${recaudadoMesActual.toFixed(2)}`;
        document.getElementById('recaudadoAcumulado').textContent = `Bs ${recaudadoAcumulado.toFixed(2)}`;
        document.getElementById('metaAnual').textContent = `Bs ${metaAnual.toFixed(2)}`;
        document.getElementById('tasaCumplimiento').textContent = `${tasaCumplimiento.toFixed(1)}%`;
        document.getElementById('totalEstudiantes').textContent = totalEstudiantes || 0;
        document.getElementById('totalApoderados').textContent = totalApoderados || 0;
        document.getElementById('pagosAtrasados').textContent = apoderadosConAtrasos;
        document.getElementById('pendientesMes').textContent = pendientesMesActual;
        
        // Resumen por niveles (todos los estudiantes registrados)
        const { count: countPrimaria } = await supabase
            .from('estudiantes')
            .select('*', { count: 'exact', head: true })
            .eq('nivel', 'Primaria');
        
        const { count: countSecundaria } = await supabase
            .from('estudiantes')
            .select('*', { count: 'exact', head: true })
            .eq('nivel', 'Secundaria');
        
        const resumenHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                <div class="info-card">
                    <h4>Primaria</h4>
                    <p class="amount" style="color: #667eea;">${countPrimaria || 0} estudiantes</p>
                </div>
                <div class="info-card">
                    <h4>Secundaria</h4>
                    <p class="amount" style="color: #764ba2;">${countSecundaria || 0} estudiantes</p>
                </div>
            </div>
        `;
        document.getElementById('resumenNiveles').innerHTML = resumenHTML;
        
        console.log('✅ Estadísticas cargadas');
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// ========================================
// CARGAR ESTUDIANTES
// ========================================
async function cargarEstudiantes() {
    try {
        const { data, error } = await supabase
            .from('estudiantes')
            .select('*')
            .order('codigo');
        
        if (error) throw error;
        
        estudiantesData = data;
        renderEstudiantes();
        
        console.log('✅ Estudiantes cargados:', data.length);
        
    } catch (error) {
        console.error('Error al cargar estudiantes:', error);
    }
}

function renderEstudiantes() {
    const tbody = document.getElementById('tablaEstudiantes');
    
    if (estudiantesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay estudiantes registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = estudiantesData.map(est => `
        <tr>
            <td><strong>${est.codigo}</strong></td>
            <td>${est.nombre_completo}</td>
            <td>${est.nivel}</td>
            <td>${est.grado}</td>
            <td><span class="badge ${est.estado === 'disponible' ? 'badge-warning' : 'badge-success'}">${est.estado}</span></td>
            <td>${est.apoderado_nombre || '-'}</td>
        </tr>
    `).join('');
}

// ========================================
// CARGAR PAGOS PENDIENTES
// ========================================
async function cargarPagos() {
    try {
        const { data, error } = await supabase
            .from('pagos')
            .select(`
                *,
                apoderados:apoderado_id (
                    nombre_completo,
                    telefono
                )
            `)
            .eq('estado', 'pendiente')
            .order('fecha_subida', { ascending: false });
        
        if (error) throw error;
        
        pagosData = data;
        renderPagos();
        
        console.log('✅ Pagos cargados:', data.length);
        
    } catch (error) {
        console.error('Error al cargar pagos:', error);
    }
}

function renderPagos() {
    const container = document.querySelector('#seccionPagos .card');
    
    if (!pagosData || pagosData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">No hay pagos pendientes de verificación</p>';
        return;
    }
    
    container.innerHTML = `
        <h3>Pagos Pendientes de Verificación</h3>
        ${pagosData.map(pago => `
            <div class="card" style="margin-top: 1rem; padding: 1rem; border-left: 4px solid #3b82f6;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h4>${pago.apoderados.nombre_completo}</h4>
                        <p><strong>Mes:</strong> ${pago.mes}</p>
                        <p><strong>Monto:</strong> Bs ${parseFloat(pago.monto).toFixed(2)}</p>
                        <p><strong>Fecha:</strong> ${new Date(pago.fecha_subida).toLocaleDateString('es-BO')}</p>
                        <a href="${pago.comprobante_url}" target="_blank" class="btn-primary" style="display: inline-block; margin-top: 0.5rem;">
                            🖼️ Ver Comprobante
                        </a>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-success" onclick="aprobarPago('${pago.id}')">✓ Aprobar</button>
                        <button class="btn-danger" onclick="rechazarPago('${pago.id}')">✗ Rechazar</button>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

// ========================================
// APROBAR/RECHAZAR PAGOS
// ========================================
window.aprobarPago = async (pagoId) => {
    const result = await Swal.fire({
        title: '¿Aprobar este pago?',
        text: 'Se registrará el pago como aprobado',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, aprobar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const { data, error } = await supabase.rpc('aprobar_pago', {
            pago_uuid: pagoId
        });
        
        if (error) throw error;
        
        if (data.success) {
            await Swal.fire({
                icon: 'success',
                title: '¡Pago aprobado!',
                confirmButtonColor: '#667eea'
            });
            cargarPagos();
            cargarEstadisticas();
        } else {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.error,
                confirmButtonColor: '#ef4444'
            });
        }
        
    } catch (error) {
        console.error('Error al aprobar pago:', error);
        alert('Error al aprobar pago: ' + error.message);
    }
};

window.rechazarPago = async (pagoId) => {
    const result = await Swal.fire({
        title: '¿Rechazar este pago?',
        input: 'textarea',
        inputLabel: 'Motivo del rechazo (opcional)',
        inputPlaceholder: 'Escriba el motivo...',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, rechazar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const { data, error } = await supabase.rpc('rechazar_pago', {
            pago_uuid: pagoId,
            nota: result.value || null
        });
        
        if (error) throw error;
        
        if (data.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Pago rechazado',
                confirmButtonColor: '#667eea'
            });
            cargarPagos();
        } else {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.error,
                confirmButtonColor: '#ef4444'
            });
        }
        
    } catch (error) {
        console.error('Error al rechazar pago:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonColor: '#ef4444'
        });
    }
};

// ========================================
// CARGAR APODERADOS
// ========================================
async function cargarApoderados() {
    try {
        const { data, error } = await supabase
            .from('apoderados')
            .select('*')
            .order('nombre_completo');
        
        if (error) throw error;
        
        apoderadosData = data;
        renderApoderados();
        
        console.log('✅ Apoderados cargados:', data.length);
        
    } catch (error) {
        console.error('Error al cargar apoderados:', error);
    }
}

function renderApoderados() {
    const container = document.querySelector('#seccionApoderados .card');
    
    if (apoderadosData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">No hay apoderados registrados</p>';
        return;
    }
    
    container.innerHTML = `
        <h3>Lista de Apoderados</h3>
        <div class="table-container" style="display:flex;justify-content:center;">
            <table>
                <thead>
                    <tr>
                        <th>Nombre Completo</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                        <th>Estado</th>
                        <th>Total Mensual</th>
                        <th>Fecha Registro</th>
                    </tr>
                </thead>
                <tbody>
                    ${apoderadosData.map(apo => `
                        <tr>
                            <td>${apo.nombre_completo}</td>
                            <td>${apo.telefono}</td>
                            <td>${apo.email || '-'}</td>
                            <td><span class="badge badge-${apo.estado === 'activo' ? 'success' : apo.estado === 'pendiente' ? 'warning' : 'danger'}">${apo.estado}</span></td>
                            <td>Bs ${parseFloat(apo.total_mensual || 0).toFixed(2)}</td>
                            <td>${new Date(apo.fecha_registro).toLocaleDateString('es-BO')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ========================================
// GESTIÓN DE TARIFAS
// ========================================
async function cargarTarifas() {
    try {
        // Año escolar 2026 (gestión educativa)
        const anioEscolar = 2026;
        document.getElementById('anioActual').textContent = anioEscolar;
        
        // Cargar tarifa del año escolar
        const { data, error } = await supabase
            .from('tarifas')
            .select('*')
            .eq('anio', anioEscolar)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        const inputPrimaria = document.getElementById('tarifaPrimaria');
        const inputSecundaria = document.getElementById('tarifaSecundaria');
        
        if (data) {
            inputPrimaria.value = parseFloat(data.primaria).toFixed(2);
            inputSecundaria.value = parseFloat(data.secundaria).toFixed(2);
            console.log('📝 Campos actualizados:', { primaria: data.primaria, secundaria: data.secundaria });
        } else {
            // Si no hay tarifas para el año actual, dejar en blanco
            inputPrimaria.value = '';
            inputSecundaria.value = '';
        }
        
        // Cargar historial de tarifas
        await cargarHistorialTarifas();
        
        console.log('✅ Tarifas cargadas');
        
    } catch (error) {
        console.error('Error al cargar tarifas:', error);
        alert('Error al cargar tarifas');
    }
}

async function cargarHistorialTarifas() {
    try {
        const { data, error } = await supabase
            .from('tarifas')
            .select('*')
            .order('anio', { ascending: false });
        
        if (error) throw error;
        
        const tbody = document.getElementById('tablaTarifasHistorial');
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay tarifas registradas</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(tarifa => `
            <tr>
                <td><strong>${tarifa.anio}</strong></td>
                <td>Bs ${parseFloat(tarifa.primaria).toFixed(2)}</td>
                <td>Bs ${parseFloat(tarifa.secundaria).toFixed(2)}</td>
                <td>${new Date(tarifa.updated_at).toLocaleDateString('es-BO')}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error al cargar historial de tarifas:', error);
    }
}

async function actualizarTarifas() {
    try {
        const primaria = parseFloat(document.getElementById('tarifaPrimaria').value);
        const secundaria = parseFloat(document.getElementById('tarifaSecundaria').value);
        
        if (!primaria || !secundaria) {
            await Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor, complete ambas tarifas',
                confirmButtonColor: '#667eea'
            });
            return;
        }
        
        if (primaria <= 0 || secundaria <= 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Valores inválidos',
                text: 'Las tarifas deben ser mayores a cero',
                confirmButtonColor: '#667eea'
            });
            return;
        }
        
        // Año escolar 2026 (gestión educativa)
        const anioEscolar = 2026;
        
        // Verificar si ya existe una tarifa para este año
        const { data: tarifaExistente } = await supabase
            .from('tarifas')
            .select('id')
            .eq('anio', anioEscolar)
            .single();
        
        let result;
        
        if (tarifaExistente) {
            // Actualizar tarifa existente
            result = await supabase
                .from('tarifas')
                .update({ 
                    primaria, 
                    secundaria,
                    updated_at: new Date().toISOString()
                })
                .eq('anio', anioEscolar);
        } else {
            // Insertar nueva tarifa
            result = await supabase
                .from('tarifas')
                .insert({ 
                    anio: anioEscolar, 
                    primaria, 
                    secundaria 
                });
        }
        
        if (result.error) throw result.error;
        
        // Recalcular total_mensual de todos los apoderados activos
        const { data: apoderados } = await supabase
            .from('apoderados')
            .select('id')
            .eq('estado', 'activo');
        
        if (apoderados && apoderados.length > 0) {
            for (const apoderado of apoderados) {
                await supabase.rpc('calcular_total_mensual', {
                    apoderado_uuid: apoderado.id
                });
            }
            console.log(`✅ Recalculados ${apoderados.length} apoderados con nuevas tarifas`);
        }
        
        await Swal.fire({
            icon: 'success',
            title: '¡Tarifas actualizadas!',
            text: 'Los totales mensuales han sido recalculados automáticamente',
            confirmButtonColor: '#667eea'
        });
        
        // Recargar tarifas actuales, historial y estadísticas
        await cargarTarifas();
        await cargarHistorialTarifas();
        await cargarEstadisticas();
        
        console.log('✅ Tarifas actualizadas:', { primaria, secundaria });
        
    } catch (error) {
        console.error('Error al actualizar tarifas:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonColor: '#ef4444'
        });
    }
}

// Event listener para botón de actualizar tarifas
document.getElementById('btnActualizarTarifas')?.addEventListener('click', actualizarTarifas);

// ========================================
// GESTIÓN DE ESTUDIANTES
// ========================================

let todosEstudiantes = [];
let estudiantesFiltrados = [];

/**
 * Cargar todos los estudiantes con información del apoderado
 */
async function cargarTodosEstudiantes() {
    try {
        const { data, error } = await supabase
            .from('estudiantes')
            .select(`
                *,
                apoderados (
                    nombre_completo,
                    email,
                    telefono
                )
            `)
            .order('codigo');
        
        if (error) throw error;
        
        todosEstudiantes = data || [];
        estudiantesFiltrados = todosEstudiantes;
        
        mostrarEstudiantes(estudiantesFiltrados);
        actualizarEstadisticasEstudiantes();
        
        console.log(`✅ ${todosEstudiantes.length} estudiantes cargados`);
    } catch (error) {
        console.error('Error al cargar estudiantes:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los estudiantes',
            confirmButtonColor: '#ef4444'
        });
    }
}

/**
 * Mostrar estudiantes en la tabla
 */
function mostrarEstudiantes(estudiantes) {
    const tbody = document.getElementById('tablaEstudiantes');
    if (!tbody) return;
    
    if (estudiantes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
                    📚 No hay estudiantes registrados<br>
                    <small>Importa estudiantes desde un archivo Excel</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = estudiantes.map(est => {
        const apoderado = est.apoderados;
        const estadoBadge = est.estado === 'asignado' 
            ? '<span class="badge badge-success">✅ Asignado</span>'
            : '<span class="badge badge-warning">⏳ Disponible</span>';
        
        const apoderadoInfo = apoderado 
            ? apoderado.nombre_completo
            : '-';
        
        const grado = est.grado || '-';
        const paralelo = est.paralelo || '-';
        
        return `
            <tr onclick="verDetalleEstudiante('${est.id}')" style="cursor: pointer;">
                <td><strong>${est.codigo}</strong></td>
                <td>${est.nombre_completo}</td>
                <td>${est.nivel}</td>
                <td>${grado}</td>
                <td>${paralelo}</td>
                <td>${estadoBadge}</td>
                <td>${apoderadoInfo}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Buscar estudiantes en tiempo real
 */
function buscarEstudiantes() {
    const termino = document.getElementById('buscarEstudiante')?.value.toLowerCase() || '';
    const filtroNivel = document.getElementById('filtroNivel')?.value || 'todos';
    const filtroEstado = document.getElementById('filtroEstado')?.value || 'todos';
    
    estudiantesFiltrados = todosEstudiantes.filter(est => {
        // Filtro por término de búsqueda
        const matchBusqueda = termino === '' || 
            est.nombre_completo.toLowerCase().includes(termino) ||
            est.codigo.includes(termino);
        
        // Filtro por nivel
        const matchNivel = filtroNivel === 'todos' || est.nivel === filtroNivel;
        
        // Filtro por estado
        const matchEstado = filtroEstado === 'todos' || est.estado === filtroEstado;
        
        return matchBusqueda && matchNivel && matchEstado;
    });
    
    mostrarEstudiantes(estudiantesFiltrados);
    
    // Actualizar contador
    const contador = document.getElementById('contadorResultados');
    if (contador) {
        contador.textContent = `Mostrando ${estudiantesFiltrados.length} de ${todosEstudiantes.length} estudiantes`;
    }
}

/**
 * Ver detalle de un estudiante
 */
window.verDetalleEstudiante = async function(estudianteId) {
    try {
        const { data: estudiante, error } = await supabase
            .from('estudiantes')
            .select(`
                *,
                apoderados (
                    nombre_completo,
                    email,
                    telefono,
                    total_mensual
                )
            `)
            .eq('id', estudianteId)
            .single();
        
        if (error) throw error;
        
        const apoderado = estudiante.apoderados;
        
        let htmlDetalle = `
            <div style="text-align: left;">
                <h3 style="margin-bottom: 1rem;">📊 Detalles del Estudiante</h3>
                
                <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p><strong>Código:</strong> ${estudiante.codigo}</p>
                    <p><strong>Nombre:</strong> ${estudiante.nombre_completo}</p>
                    <p><strong>Nivel:</strong> ${estudiante.nivel}</p>
                    <p><strong>Grado:</strong> ${estudiante.grado || 'No especificado'}</p>
                    <p><strong>Paralelo:</strong> ${estudiante.paralelo || 'No especificado'}</p>
                    <p><strong>Estado:</strong> ${estudiante.estado === 'asignado' ? '✅ Asignado' : '⏳ Disponible'}</p>
                </div>
        `;
        
        if (apoderado) {
            htmlDetalle += `
                <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem;">👤 Apoderado</h4>
                <div style="background: #ecfdf5; padding: 1rem; border-radius: 8px;">
                    <p><strong>Nombre:</strong> ${apoderado.nombre_completo}</p>
                    <p><strong>Email:</strong> ${apoderado.email}</p>
                    <p><strong>Teléfono:</strong> ${apoderado.telefono || 'No registrado'}</p>
                    <p><strong>Total mensual:</strong> Bs ${parseFloat(apoderado.total_mensual || 0).toFixed(2)}</p>
                </div>
            `;
            
            // Obtener pagos relacionados
            const { data: pagos } = await supabase
                .from('pagos')
                .select('*')
                .eq('apoderado_id', estudiante.apoderado_id)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (pagos && pagos.length > 0) {
                htmlDetalle += `
                    <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem;">💰 Últimos Pagos</h4>
                    <div style="background: #eff6ff; padding: 1rem; border-radius: 8px;">
                `;
                
                pagos.forEach(pago => {
                    const fecha = new Date(pago.created_at).toLocaleDateString();
                    const estadoBadge = pago.estado === 'aprobado' ? '✅' : 
                                       pago.estado === 'rechazado' ? '❌' : '⏳';
                    htmlDetalle += `
                        <p>${estadoBadge} ${fecha} - Bs ${parseFloat(pago.monto).toFixed(2)} (${pago.mes})</p>
                    `;
                });
                
                htmlDetalle += `</div>`;
            }
        } else {
            htmlDetalle += `
                <div style="background: #fef3c7; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                    <p>⚠️ Este estudiante aún no ha sido asignado a ningún apoderado</p>
                </div>
            `;
        }
        
        htmlDetalle += `</div>`;
        
        await Swal.fire({
            html: htmlDetalle,
            width: 600,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#667eea'
        });
        
    } catch (error) {
        console.error('Error al ver detalle:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar el detalle del estudiante',
            confirmButtonColor: '#ef4444'
        });
    }
};

/**
 * Actualizar estadísticas de estudiantes
 */
function actualizarEstadisticasEstudiantes() {
    const total = todosEstudiantes.length;
    const asignados = todosEstudiantes.filter(e => e.estado === 'asignado').length;
    const sinAsignar = total - asignados;
    const primaria = todosEstudiantes.filter(e => e.nivel === 'Primaria').length;
    const secundaria = todosEstudiantes.filter(e => e.nivel === 'Secundaria').length;
    
    const porcentajeAsignado = total > 0 ? ((asignados / total) * 100).toFixed(1) : 0;
    
    const statsHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div style="background: #667eea; color: white; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold;">${total}</div>
                <div style="opacity: 0.9;">Total Estudiantes</div>
            </div>
            <div style="background: #10b981; color: white; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold;">${asignados}</div>
                <div style="opacity: 0.9;">Asignados (${porcentajeAsignado}%)</div>
            </div>
            <div style="background: #f59e0b; color: white; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold;">${sinAsignar}</div>
                <div style="opacity: 0.9;">Disponibles</div>
            </div>
            <div style="background: #3b82f6; color: white; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold;">${primaria}</div>
                <div style="opacity: 0.9;">Primaria</div>
            </div>
            <div style="background: #8b5cf6; color: white; padding: 1rem; border-radius: 8px;">
                <div style="font-size: 2rem; font-weight: bold;">${secundaria}</div>
                <div style="opacity: 0.9;">Secundaria</div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('estadisticasEstudiantes');
    if (container) {
        container.innerHTML = statsHtml;
    }
}

/**
 * Importar estudiantes desde Excel
 */
window.importarExcelEstudiantes = async function() {
    const { value: file } = await Swal.fire({
        title: 'Importar Estudiantes desde Excel',
        html: `
            <div style="text-align: left; margin-bottom: 1rem;">
                <p><strong>Formato del archivo Excel:</strong></p>
                <ul style="margin-left: 1.5rem;">
                    <li>Columna 1: <code>nombre_completo</code> (obligatorio)</li>
                    <li>Columna 2: <code>nivel</code> (obligatorio: "Primaria" o "Secundaria")</li>
                    <li>Columna 3: <code>grado</code> (opcional)</li>
                    <li>Columna 4: <code>paralelo</code> (opcional)</li>
                </ul>
                <p style="margin-top: 1rem;"><small>Los códigos se generarán automáticamente (0001, 0002, etc.)</small></p>
            </div>
            <input type="file" id="archivoExcel" accept=".xlsx,.xls,.csv" class="swal2-file" style="display: block; margin: 1rem auto;">
        `,
        showCancelButton: true,
        confirmButtonText: 'Importar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#667eea',
        preConfirm: () => {
            const fileInput = document.getElementById('archivoExcel');
            if (!fileInput.files[0]) {
                Swal.showValidationMessage('Debe seleccionar un archivo');
                return false;
            }
            return fileInput.files[0];
        }
    });
    
    if (file) {
        await procesarImportacionExcel(file);
    }
};

/**
 * Procesar importación de Excel
 */
async function procesarImportacionExcel(file) {
    try {
        Swal.fire({
            title: 'Procesando...',
            html: 'Leyendo archivo Excel...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Importar módulo de importación
        const { procesarArchivoExcel, importarEstudiantes } = await import('./estudiantes-import.js');
        
        const { estudiantes, errores } = await procesarArchivoExcel(file);
        
        if (errores.length > 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Errores de validación',
                html: `
                    <div style="text-align: left;">
                        <p>Se encontraron ${errores.length} errores:</p>
                        <ul style="max-height: 200px; overflow-y: auto; margin-left: 1.5rem;">
                            ${errores.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                        <p style="margin-top: 1rem;">Se importarán ${estudiantes.length} estudiantes válidos.</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Continuar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#667eea'
            });
        }
        
        if (estudiantes.length === 0) {
            await Swal.fire({
                icon: 'error',
                title: 'No hay datos para importar',
                text: 'El archivo no contiene estudiantes válidos',
                confirmButtonColor: '#ef4444'
            });
            return;
        }
        
        Swal.fire({
            title: 'Importando...',
            html: `Importando ${estudiantes.length} estudiantes...`,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        const resultados = await importarEstudiantes(estudiantes);
        
        await Swal.fire({
            icon: resultados.fallidos === 0 ? 'success' : 'warning',
            title: '¡Importación completada!',
            html: `
                <p>✅ Importados: ${resultados.exitosos}</p>
                <p>❌ Fallidos: ${resultados.fallidos}</p>
                ${resultados.errores.length > 0 ? `<p style="color: #ef4444; margin-top: 1rem;">${resultados.errores.join('<br>')}</p>` : ''}
            `,
            confirmButtonColor: '#667eea'
        });
        
        // Recargar tabla
        await cargarTodosEstudiantes();
        
    } catch (error) {
        console.error('Error al importar:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error al importar',
            text: error.message,
            confirmButtonColor: '#ef4444'
        });
    }
}

/**
 * Descargar PDF con códigos
 */
window.descargarPDFCodigos = async function() {
    try {
        Swal.fire({
            title: 'Generando PDF...',
            html: 'Por favor espere...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        const { generarPDFCodigos } = await import('./estudiantes-import.js');
        await generarPDFCodigos();
        
        Swal.close();
        
        await Swal.fire({
            icon: 'success',
            title: '¡PDF generado!',
            text: 'El archivo se ha descargado correctamente',
            confirmButtonColor: '#667eea'
        });
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el PDF: ' + error.message,
            confirmButtonColor: '#ef4444'
        });
    }
};

// Event listeners para gestión de estudiantes
document.getElementById('buscarEstudiante')?.addEventListener('input', buscarEstudiantes);
document.getElementById('filtroNivel')?.addEventListener('change', buscarEstudiantes);
document.getElementById('filtroEstado')?.addEventListener('change', buscarEstudiantes);
document.getElementById('btnImportarExcel')?.addEventListener('click', importarExcelEstudiantes);
document.getElementById('btnDescargarPDF')?.addEventListener('click', descargarPDFCodigos);

// ========================================
// UTILIDADES
// ========================================
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ========================================
// REPORTES - INTEGRACIÓN
// ========================================

// Variable global para almacenar todos los apoderados
let todosLosApoderados = [];
let apoderadoSeleccionadoId = null;

/**
 * Carga todos los apoderados activos en el select de reportes individuales
 */
async function cargarApoderadosReportes() {
    try {
        const { data, error } = await supabase
            .from('apoderados')
            .select('id, nombre_completo, email')
            .order('nombre_completo');
        
        if (error) throw error;
        
        todosLosApoderados = data;
        
        // Configurar el buscador
        configurarBuscadorApoderados();
        
        console.log(`✅ ${data.length} apoderados cargados para búsqueda`);
    } catch (error) {
        console.error('❌ Error cargando apoderados para reportes:', error);
    }
}

/**
 * Configura el buscador de apoderados con autocompletado
 */
function configurarBuscadorApoderados() {
    const inputBuscar = document.getElementById('buscarApoderadoInput');
    const selectApoderado = document.getElementById('selectApoderadoReporte');
    const divSeleccionado = document.getElementById('apoderadoSeleccionado');
    
    if (!inputBuscar || !selectApoderado) {
        console.error('❌ No se encontraron elementos del buscador');
        return;
    }
    
    // Limpiar selección previa
    apoderadoSeleccionadoId = null;
    divSeleccionado.textContent = '';
    
    // Evento de búsqueda
    inputBuscar.addEventListener('input', (e) => {
        const textoBusqueda = e.target.value.toLowerCase().trim();
        
        if (textoBusqueda.length === 0) {
            selectApoderado.style.display = 'none';
            return;
        }
        
        // Filtrar apoderados
        const apoderadosFiltrados = todosLosApoderados.filter(apoderado => {
            const nombre = apoderado.nombre_completo ? apoderado.nombre_completo.toLowerCase() : '';
            const email = apoderado.email ? apoderado.email.toLowerCase() : '';
            return nombre.includes(textoBusqueda) || email.includes(textoBusqueda);
        });
        
        // Mostrar resultados
        if (apoderadosFiltrados.length > 0) {
            selectApoderado.innerHTML = '';
            apoderadosFiltrados.forEach(apoderado => {
                const option = document.createElement('option');
                option.value = apoderado.id;
                option.textContent = `${apoderado.nombre_completo} - ${apoderado.email}`;
                selectApoderado.appendChild(option);
            });
            selectApoderado.style.display = 'block';
        } else {
            selectApoderado.innerHTML = '<option disabled>No se encontraron resultados</option>';
            selectApoderado.style.display = 'block';
        }
    });
    
    // Evento de selección
    selectApoderado.addEventListener('change', (e) => {
        const apoderadoId = e.target.value;
        const apoderado = todosLosApoderados.find(a => a.id === apoderadoId);
        
        if (apoderado) {
            apoderadoSeleccionadoId = apoderado.id;
            inputBuscar.value = apoderado.nombre_completo;
            divSeleccionado.innerHTML = `✅ Seleccionado: <strong>${apoderado.nombre_completo}</strong> (${apoderado.email})`;
            selectApoderado.style.display = 'none';
        }
    });
    
    // Evento clic en option (alternativo)
    selectApoderado.addEventListener('click', (e) => {
        if (selectApoderado.value) {
            const event = new Event('change');
            selectApoderado.dispatchEvent(event);
        }
    });
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!inputBuscar.contains(e.target) && !selectApoderado.contains(e.target)) {
            selectApoderado.style.display = 'none';
        }
    });
}

/**
 * Genera reporte de estudiantes según filtro
 */
window.generarReporteEstudiantes = async function(filtro) {
    try {
        Swal.fire({
            title: 'Generando reporte...',
            html: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Construir query según filtro
        let query = supabase
            .from('estudiantes')
            .select(`
                *,
                apoderados (
                    nombre_completo,
                    email,
                    telefono
                )
            `)
            .order('nombre_completo');
        
        // Aplicar filtros
        if (filtro === 'primaria') {
            query = query.eq('nivel', 'Primaria');
        } else if (filtro === 'secundaria') {
            query = query.eq('nivel', 'Secundaria');
        } else if (filtro === 'disponibles') {
            query = query.eq('estado', 'disponible');
        } else if (filtro === 'asignados') {
            query = query.eq('estado', 'asignado');
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        Swal.close();
        
        // Generar HTML para imprimir
        generarHTMLReporteEstudiantes(data, filtro);
        
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte'
        });
    }
};

/**
 * Genera HTML imprimible para reporte de estudiantes
 */
function generarHTMLReporteEstudiantes(estudiantes, filtro) {
    const filtroTexto = {
        'todos': 'Todos los Estudiantes',
        'primaria': 'Estudiantes de Primaria',
        'secundaria': 'Estudiantes de Secundaria',
        'disponibles': 'Estudiantes Disponibles',
        'asignados': 'Estudiantes Asignados'
    };
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
        <title>Reporte de Estudiantes - ${filtroTexto[filtro]}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: Arial, sans-serif;
                background: #fff;
                min-height: 100vh;
                width: 100vw;
                text-align: center;
            }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #2563eb; font-size: 1.5rem; }
            .header h2 { font-size: 1.2rem; color: #334155; margin-top: 0.5rem; }
            .header p { margin: 5px 0; color: #666; font-size: 0.9rem; }
            .info-box { background: #f3f4f6; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
            .table-wrapper {
                width: 100vw;
                min-width: 100vw;
                max-width: 100vw;
                overflow-x: auto;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                text-align: center;
            }
            table {
                min-width: 180px;
                width: auto;
                max-width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                background: #fff;
                box-sizing: border-box;
                margin-left: auto;
                margin-right: auto;
                display: inline-table;
            }
            th { background: #2563eb; color: white; padding: 12px 8px; text-align: left; font-size: 0.9rem; }
            td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem; }
            tr:nth-child(even) { background: #f9fafb; }
            .print-btn { margin: 20px 0; padding: 10px 20px; background: #2563eb; color: white; border: none; cursor: pointer; border-radius: 5px; font-size: 1rem; }
            @media print {
                .print-btn { display: none; }
            }
            @media (max-width: 768px) {
                body {
                    font-size: 15px;
                    min-height: 100vh;
                    width: 100vw;
                    text-align: center;
                }
                .header h1 { font-size: 1.1rem; }
                .header h2 { font-size: 0.95rem; }
                .table-wrapper {
                    width: 100vw;
                    min-width: 100vw;
                    max-width: 100vw;
                    text-align: center;
                }
                table {
                    min-width: 120px;
                    width: auto;
                    max-width: 100vw;
                    font-size: 0.9rem;
                    margin-left: auto;
                    margin-right: auto;
                    display: inline-table;
                }
                th, td { padding: 8px 4px; font-size: 0.85rem; }
            }
        </style>
    </head>
    <body>
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
        
        <div class="header">
            <h1>Sistema de Pagos Escolares</h1>
            <h2>${filtroTexto[filtro]}</h2>
            <p>Fecha: ${new Date().toLocaleDateString('es-BO', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</p>
        </div>
        
        <div class="info-box">
            <strong>Total de estudiantes:</strong> ${estudiantes.length}
        </div>
        
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre Completo</th>
                        <th>Nivel</th>
                        <th>Grado</th>
                        <th>Paralelo</th>
                        <th>Estado</th>
                        <th>Apoderado</th>
                        <th>Contacto</th>
                    </tr>
                </thead>
                <tbody>
                    ${estudiantes.map(est => `
                        <tr>
                            <td>${est.codigo}</td>
                            <td>${est.nombre_completo}</td>
                            <td>${est.nivel}</td>
                            <td>${est.grado || '-'}</td>
                            <td>${est.paralelo || '-'}</td>
                            <td>${est.estado === 'asignado' ? '✅' : '⏳'}</td>
                            <td>${est.apoderados ? est.apoderados.nombre_completo : '-'}</td>
                            <td>${est.apoderados ? est.apoderados.telefono || est.apoderados.email : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    `;
    
    const ventana = window.open('', '_blank');
    ventana.document.write(html);
    ventana.document.close();
}

/**
 * Genera reporte de pagos según tipo
 */
window.generarReportePagos = async function(tipo) {
    try {
        Swal.fire({
            title: 'Generando reporte...',
            html: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Obtener datos según tipo
        let query = supabase
            .from('pagos')
            .select(`
                *,
                apoderados (
                    nombre_completo,
                    email
                )
            `)
            .order('fecha_subida', { ascending: false });
        
        // Filtrar según tipo
        const ahora = new Date();
        const mesActual = ahora.getMonth() + 1;
        const anioActual = ahora.getFullYear();
        
        if (tipo === 'mes') {
            // Pagos del mes actual
            const inicioMes = new Date(anioActual, mesActual - 1, 1);
            const finMes = new Date(anioActual, mesActual, 0, 23, 59, 59);
            query = query
                .gte('fecha_subida', inicioMes.toISOString())
                .lte('fecha_subida', finMes.toISOString());
        } else if (tipo === 'anual') {
            // Pagos del año actual
            const inicioAnio = new Date(anioActual, 0, 1);
            const finAnio = new Date(anioActual, 11, 31, 23, 59, 59);
            query = query
                .gte('fecha_subida', inicioAnio.toISOString())
                .lte('fecha_subida', finAnio.toISOString());
        } else if (tipo === 'pendientes') {
            query = query.eq('estado', 'pendiente');
        }
        
        const { data: pagos, error } = await query;
        
        if (error) throw error;
        
        Swal.close();
        
        // Generar HTML para imprimir
        generarHTMLReportePagos(pagos, tipo);
        
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte'
        });
    }
};

/**
 * Genera HTML imprimible para reporte de pagos
 */
function generarHTMLReportePagos(pagos, tipo) {
    const tipoTexto = {
        'mes': 'Pagos del Mes',
        'anual': 'Pagos del Año',
        'pendientes': 'Pagos Pendientes'
    };
    
    const totalMonto = pagos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
        <title>Reporte de Pagos - ${tipoTexto[tipo]}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; background: #fff; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #2563eb; font-size: 1.5rem; }
            .header h2 { font-size: 1.2rem; color: #334155; margin-top: 0.5rem; }
            .header p { margin: 5px 0; color: #666; font-size: 0.9rem; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
            .summary-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #2563eb; color: white; padding: 12px 8px; text-align: left; font-size: 0.9rem; }
            td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem; }
            tr:nth-child(even) { background: #f9fafb; }
            .print-btn { margin: 20px 0; padding: 10px 20px; background: #2563eb; color: white; border: none; cursor: pointer; border-radius: 5px; font-size: 1rem; }
            @media print {
                .print-btn { display: none; }
            }
            @media (max-width: 768px) {
                body { padding: 10px; font-size: 16px; }
                .header h1 { font-size: 1.3rem; }
                .header h2 { font-size: 1rem; }
                .summary { grid-template-columns: 1fr; gap: 10px; }
                table { font-size: 0.95rem; }
                th, td { padding: 10px 6px; font-size: 0.9rem; }
            }
        </style>
    </head>
    <body>
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
        
        <div class="header">
            <h1>Sistema de Pagos Escolares</h1>
            <h2>${tipoTexto[tipo]}</h2>
            <p>Fecha: ${new Date().toLocaleDateString('es-BO', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <strong>Total Pagos:</strong><br>
                ${pagos.length}
            </div>
            <div class="summary-card">
                <strong>Monto Total:</strong><br>
                Bs ${totalMonto.toFixed(2)}
            </div>
            <div class="summary-card">
                <strong>Promedio:</strong><br>
                Bs ${pagos.length > 0 ? (totalMonto / pagos.length).toFixed(2) : '0.00'}
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Apoderado</th>
                    <th>Mes</th>
                    <th>Monto</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${pagos.map(pago => {
                    const [anio, mes] = pago.mes.split('-');
                    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    const mesNombre = meses[parseInt(mes) - 1] + ' ' + anio;
                    
                    return `
                    <tr>
                        <td>${new Date(pago.fecha_subida).toLocaleDateString('es-BO')}</td>
                        <td>${pago.apoderados ? pago.apoderados.nombre_completo : 'N/A'}</td>
                        <td>${mesNombre}</td>
                        <td>Bs ${parseFloat(pago.monto).toFixed(2)}</td>
                        <td>${pago.estado === 'aprobado' ? '✅' : pago.estado === 'rechazado' ? '❌' : '⏳'}</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;
    
    const ventana = window.open('', '_blank');
    ventana.document.write(html);
    ventana.document.close();
}

/**
 * Genera reporte de apoderados morosos
 */
window.generarReporteMorosos = async function() {
    try {
        Swal.fire({
            title: 'Calculando morosos...',
            html: 'Analizando pagos pendientes',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Obtener todos los apoderados con sus estudiantes y pagos
        const { data: apoderados, error } = await supabase
            .from('apoderados')
            .select(`
                *,
                estudiantes (
                    id,
                    nombre_completo
                ),
                pagos (
                    mes,
                    estado,
                    fecha_subida
                )
            `)
            .order('nombre_completo');
        
        if (error) throw error;
        
        // Calcular meses vencidos para cada apoderado
        const ahora = new Date();
        const mesActual = ahora.getMonth() + 1; // 1-12
        const anioActual = ahora.getFullYear();
        
        // Meses escolares en formato numérico (febrero=2 a noviembre=11)
        const mesesEscolaresNum = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        const mesesNombres = {
            2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
            7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre'
        };
        
        const morosos = [];
        
        // Determinar si estamos en periodo escolar
        let anioEscolar;
        let dentroDelPeriodoEscolar = false;
        
        if (mesActual >= 2 && mesActual <= 11) {
            // Estamos dentro del año escolar (Feb-Nov del año actual)
            anioEscolar = anioActual;
            dentroDelPeriodoEscolar = true;
        } else {
            // Estamos en Dic/Ene (fuera del año escolar)
            // No se evalúan morosos
        }
        
        // Solo evaluar morosos si estamos dentro del periodo escolar
        if (!dentroDelPeriodoEscolar) {
            Swal.close();
            
            // Mostrar mensaje informativo
            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Apoderados Morosos</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                    .mensaje { background: #fef3c7; border: 2px solid #f59e0b; padding: 30px; border-radius: 10px; margin: 50px auto; max-width: 600px; }
                    h2 { color: #92400e; }
                </style>
            </head>
            <body>
                <div class="mensaje">
                    <h2>📅 Fuera del Periodo Escolar</h2>
                    <p>Actualmente estamos en <strong>${ahora.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}</strong></p>
                    <p>El año escolar <strong>2025 ha finalizado</strong> en Noviembre.</p>
                    <p>El año escolar <strong>2026 iniciará en Febrero 2026</strong>.</p>
                    <br>
                    <p><strong>No hay apoderados morosos en este momento.</strong></p>
                </div>
            </body>
            </html>
            `;
            
            const ventana = window.open('', '_blank');
            ventana.document.write(html);
            ventana.document.close();
            return; // Salir de la función completa
        }
        
        // Evaluar morosos dentro del periodo escolar
        apoderados.forEach(apoderado => {
            // Meses pagados (aprobados) - mantener formato completo "YYYY-MM"
            const mesesPagados = apoderado.pagos
                .filter(p => p.estado === 'aprobado')
                .map(p => p.mes);
            
            // Calcular meses vencidos (anteriores al mes actual y no pagados)
            const mesesVencidos = [];
            
            for (const mesNum of mesesEscolaresNum) {
                // Formato esperado: "YYYY-MM" del año escolar
                const mesEsperado = `${anioEscolar}-${mesNum.toString().padStart(2, '0')}`;
                
                // Construir fechas para comparar
                const fechaMesEscolar = new Date(anioEscolar, mesNum - 1, 1);
                const fechaHoy = new Date(anioActual, mesActual - 1, ahora.getDate());
                
                // Solo considerar meses que ya pasaron
                if (fechaMesEscolar < fechaHoy) {
                    if (!mesesPagados.includes(mesEsperado)) {
                        mesesVencidos.push(mesesNombres[mesNum]);
                    }
                }
            }
            
            // Si tiene meses vencidos, es moroso
            if (mesesVencidos.length > 0) {
                morosos.push({
                    ...apoderado,
                    mesesVencidos: mesesVencidos,
                    cantidadMesesVencidos: mesesVencidos.length,
                    cantidadEstudiantes: apoderado.estudiantes.length
                });
            }
        });
        
        // Ordenar por cantidad de meses vencidos (descendente)
        morosos.sort((a, b) => b.cantidadMesesVencidos - a.cantidadMesesVencidos);
        
        Swal.close();
        
        // Generar HTML para imprimir
        generarHTMLReporteMorosos(morosos);
        
    } catch (error) {
        console.error('❌ Error generando reporte de morosos:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte'
        });
    }
};

/**
 * Genera HTML imprimible para reporte de morosos
 */
function generarHTMLReporteMorosos(morosos) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
        <title>Reporte de Apoderados Morosos</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; background: #fff; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #dc2626; font-size: 1.5rem; }
            .header p { margin: 5px 0; color: #666; font-size: 0.9rem; }
            .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #dc2626; color: white; padding: 12px 8px; text-align: left; font-size: 0.9rem; }
            td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem; }
            tr:nth-child(even) { background: #f9fafb; }
            .print-btn { margin: 20px 0; padding: 10px 20px; background: #dc2626; color: white; border: none; cursor: pointer; border-radius: 5px; font-size: 1rem; }
            .meses-vencidos { color: #dc2626; font-weight: bold; }
            @media print {
                .print-btn { display: none; }
            }
            @media (max-width: 768px) {
                body { padding: 10px; font-size: 16px; }
                .header h1 { font-size: 1.3rem; }
                table { font-size: 0.95rem; }
                th, td { padding: 10px 6px; font-size: 0.9rem; }
            }
        </style>
    </head>
    <body>
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
        
        <div class="header">
            <h1>⚠️ Reporte de Apoderados Morosos</h1>
            <p>Fecha: ${new Date().toLocaleDateString('es-BO', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</p>
        </div>
        
        <div class="alert">
            <strong>Total de apoderados morosos:</strong> ${morosos.length}<br>
            <strong>Nota:</strong> Se consideran morosos los apoderados con pagos pendientes de meses anteriores al actual.
        </div>
        
        <div class="table-wrapper" style="overflow-x:auto;display:flex;justify-content:center;">
            <table style="border-collapse:collapse;margin-bottom:20px;background:#fff;box-sizing:border-box;width:100%;min-width:600px;max-width:1200px;">
                <thead>
                    <tr>
                        <th>Apoderado</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Estudiantes</th>
                        <th>Meses Vencidos</th>
                        <th>Meses Pendientes</th>
                    </tr>
                </thead>
                <tbody>
                    ${morosos.map(moroso => `
                    <tr>
                        <td>${moroso.nombre_completo}</td>
                        <td>${moroso.email}</td>
                        <td>${moroso.telefono || '-'}</td>
                        <td>${moroso.cantidadEstudiantes}</td>
                        <td class="meses-vencidos">${moroso.cantidadMesesVencidos}</td>
                        <td>${moroso.mesesVencidos.join(', ')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;
    
    const ventana = window.open('', '_blank');
    ventana.document.write(html);
    ventana.document.close();
}

/**
 * Genera reporte individual de un apoderado
 */
window.generarReporteApoderado = async function() {
    try {
        // Usar el apoderado seleccionado desde la búsqueda
        if (!apoderadoSeleccionadoId) {
            Swal.fire({
                icon: 'warning',
                title: 'Selecciona un apoderado',
                text: 'Por favor busca y selecciona un apoderado de la lista'
            });
            return;
        }
        
        const apoderadoId = apoderadoSeleccionadoId;
        
        Swal.fire({
            title: 'Generando reporte...',
            html: 'Obteniendo información del apoderado',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Obtener datos completos del apoderado Y las tarifas
        const [apoderadoResult, tarifasResult] = await Promise.all([
            supabase
                .from('apoderados')
                .select(`
                    *,
                    estudiantes (
                        id,
                        codigo,
                        nombre_completo,
                        nivel,
                        grado,
                        paralelo
                    ),
                    pagos (
                        id,
                        mes,
                        monto,
                        fecha_subida,
                        estado,
                        comprobante_url
                    )
                `)
                .eq('id', apoderadoId)
                .single(),
            supabase
                .from('tarifas')
                .select('*')
                .order('anio', { ascending: false })
                .limit(1)
                .single()
        ]);
        
        if (apoderadoResult.error) throw apoderadoResult.error;
        if (tarifasResult.error) throw tarifasResult.error;
        
        const apoderado = apoderadoResult.data;
        const tarifas = tarifasResult.data;
        
        Swal.close();
        
        // Generar HTML para imprimir
        generarHTMLReporteApoderado(apoderado, tarifas);
        
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte'
        });
    }
};

/**
 * Genera HTML imprimible para reporte individual de apoderado
 */
function generarHTMLReporteApoderado(apoderado, tarifas) {
    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1;
    const anioActual = ahora.getFullYear();
    
    let anioEscolar;
    let dentroDelPeriodoEscolar = false;
    let mensajePeriodoEscolar = '';
    
    if (mesActual >= 2 && mesActual <= 11) {
        anioEscolar = anioActual;
        dentroDelPeriodoEscolar = true;
    } else {
        mensajePeriodoEscolar = `
            <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <strong>📅 Periodo Escolar:</strong> El año escolar ${anioActual} finalizó en Noviembre. 
                El año escolar ${anioActual + 1} iniciará en Febrero ${anioActual + 1}.
            </div>
        `;
    }
    
    const estudiantesOrdenados = [...apoderado.estudiantes].sort((a, b) => {
        if (a.nivel === 'Primaria' && b.nivel === 'Secundaria') return -1;
        if (a.nivel === 'Secundaria' && b.nivel === 'Primaria') return 1;
        return 0;
    });
    
    let tarifaMensual = 0;
    apoderado.estudiantes.forEach(est => {
        if (est.nivel === 'Primaria') {
            tarifaMensual += parseFloat(tarifas.primaria);
        } else if (est.nivel === 'Secundaria') {
            tarifaMensual += parseFloat(tarifas.secundaria);
        }
    });
    
    const pagosAprobados = apoderado.pagos.filter(p => p.estado === 'aprobado');
    const totalPagado = pagosAprobados.reduce((sum, p) => sum + parseFloat(p.monto), 0);
    
    let montoPendiente = totalPagado;
    const detalleCobertura = [];
    
    estudiantesOrdenados.forEach(est => {
        const tarifaEst = est.nivel === 'Primaria' ? parseFloat(tarifas.primaria) : parseFloat(tarifas.secundaria);
        
        if (montoPendiente >= tarifaEst) {
            montoPendiente -= tarifaEst;
            detalleCobertura.push(`✅ ${est.nombre_completo} (${est.nivel}): Cubierto`);
        } else if (montoPendiente > 0) {
            const porcentaje = (montoPendiente / tarifaEst * 100).toFixed(0);
            detalleCobertura.push(`⚠️ ${est.nombre_completo} (${est.nivel}): ${porcentaje}% cubierto`);
            montoPendiente = 0;
        } else {
            detalleCobertura.push(`❌ ${est.nombre_completo} (${est.nivel}): Sin cubrir`);
        }
    });
    
    const mesesCubiertos = tarifaMensual > 0 ? totalPagado / tarifaMensual : 0;
    
    const mesesNombres = {
        2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
        7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre'
    };
    
    let mesesPagados = Math.floor(mesesCubiertos);
    let mesesPendientes = [];
    let estadoGeneral = '';
    let detalleFinanciero = '';
    
    if (dentroDelPeriodoEscolar) {
        const mesesEscolaresNum = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        const mesesVencidos = mesesEscolaresNum.filter(mesNum => {
            const fechaMes = new Date(anioEscolar, mesNum - 1, 1);
            const fechaHoy = new Date(anioActual, mesActual - 1, ahora.getDate());
            return fechaMes < fechaHoy;
        }).length;
        
        if (mesesPagados >= mesesVencidos) {
            estadoGeneral = '✅ Al día';
        } else {
            estadoGeneral = '⚠️ Pendiente';
            const mesesFaltantes = mesesVencidos - mesesPagados;
            const primerMesNoPagado = mesesPagados + 1;
            for (let i = 0; i < mesesFaltantes && (primerMesNoPagado + i) <= 11; i++) {
                const mesNum = mesesEscolaresNum[primerMesNoPagado - 1 + i];
                if (mesNum) {
                    mesesPendientes.push(mesesNombres[mesNum]);
                }
            }
        }
        
        detalleFinanciero = `
            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 5px; margin-top: 15px;">
                <div style="margin-bottom: 10px;">
                    💡 <strong>Cálculo:</strong> Bs ${totalPagado.toFixed(2)} ÷ Bs ${tarifaMensual.toFixed(2)}/mes = ${mesesCubiertos.toFixed(2)} meses
                </div>
                <div style="background: white; padding: 10px; border-radius: 5px; margin-top: 10px;">
                    <strong>📊 Cobertura:</strong><br>
                    ${detalleCobertura.map(d => `<div style="margin: 5px 0;">${d}</div>`).join('')}
                </div>
            </div>
        `;
    } else {
        estadoGeneral = '✅ Al día (Periodo no iniciado)';
        
        if (totalPagado > 0) {
            detalleFinanciero = `
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin-top: 15px;">
                    <div style="margin-bottom: 10px;">
                        💡 <strong>Pago adelantado:</strong> Bs ${totalPagado.toFixed(2)} cubren ${mesesCubiertos.toFixed(2)} meses del próximo año escolar.
                    </div>
                </div>
            `;
        }
    }
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
        <title>Reporte Individual - ${apoderado.nombre_completo}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; background: #fff; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #2563eb; font-size: 1.5rem; }
            .header h2 { font-size: 1.2rem; color: #334155; margin-top: 0.5rem; }
            .header p { margin: 5px 0; color: #666; font-size: 0.9rem; }
            .section { margin-bottom: 30px; }
            .section h3 { background: #2563eb; color: white; padding: 10px; margin: 0 0 15px 0; font-size: 1.1rem; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
            .info-item { background: #f3f4f6; padding: 10px; border-radius: 5px; }
            .info-item strong { display: block; color: #374151; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #e5e7eb; color: #1f2937; padding: 10px 8px; text-align: left; font-size: 0.9rem; }
            td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem; }
            tr:nth-child(even) { background: #f9fafb; }
            .print-btn { margin: 20px 0; padding: 10px 20px; background: #2563eb; color: white; border: none; cursor: pointer; border-radius: 5px; font-size: 1rem; }
            @media print {
                .print-btn { display: none; }
            }
            @media (max-width: 768px) {
                body { padding: 10px; font-size: 16px; }
                .header h1 { font-size: 1.3rem; }
                .header h2 { font-size: 1rem; }
                .info-grid { grid-template-columns: 1fr; gap: 10px; }
                .section h3 { font-size: 1rem; }
                table { font-size: 0.95rem; }
                th, td { padding: 10px 6px; font-size: 0.9rem; }
            }
        </style>
    </head>
    <body>
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
        
        <div class="header">
            <h1>Sistema de Pagos Escolares</h1>
            <h2>Reporte Individual de Apoderado</h2>
            <p>Fecha: ${new Date().toLocaleDateString('es-BO', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</p>
        </div>
        
        ${mensajePeriodoEscolar}
        
        <div class="section">
            <h3>📋 Información del Apoderado</h3>
            <div class="info-grid">
                <div class="info-item">
                    <strong>Nombre Completo:</strong>
                    ${apoderado.nombre_completo}
                </div>
                <div class="info-item">
                    <strong>Email:</strong>
                    ${apoderado.email}
                </div>
                <div class="info-item">
                    <strong>Teléfono:</strong>
                    ${apoderado.telefono || 'No registrado'}
                </div>
                <div class="info-item">
                    <strong>Fecha de Registro:</strong>
                    ${new Date(apoderado.created_at).toLocaleDateString('es-BO')}
                </div>
            </div>
        </div>
        
        <div class="section">
            <h3>👨‍👩‍👧‍👦 Estudiantes a Cargo (${apoderado.estudiantes.length})</h3>
            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre Completo</th>
                        <th>Nivel</th>
                        <th>Grado</th>
                        <th>Paralelo</th>
                    </tr>
                </thead>
                <tbody>
                    ${apoderado.estudiantes.map(est => `
                        <tr>
                            <td>${est.codigo}</td>
                            <td>${est.nombre_completo}</td>
                            <td>${est.nivel}</td>
                            <td>${est.grado || '-'}</td>
                            <td>${est.paralelo || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h3>💰 Resumen Financiero</h3>
            <div class="info-grid">
                <div class="info-item">
                    <strong>Total Pagado:</strong>
                    Bs ${totalPagado.toFixed(2)}
                </div>
                <div class="info-item">
                    <strong>Meses Pagados:</strong>
                    ${mesesPagados} de 10
                </div>
                <div class="info-item">
                    <strong>Meses Pendientes:</strong>
                    ${mesesPendientes.length > 0 ? mesesPendientes.join(', ') : 'Ninguno'}
                </div>
                <div class="info-item">
                    <strong>Estado:</strong>
                    ${estadoGeneral}
                </div>
            </div>
            ${detalleFinanciero}
        </div>
        
        <div class="section">
            <h3>📑 Historial de Pagos (${apoderado.pagos.length})</h3>
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Mes Pagado</th>
                        <th>Monto</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${apoderado.pagos
                        .sort((a, b) => new Date(b.fecha_subida) - new Date(a.fecha_subida))
                        .map(pago => {
                            const [anio, mes] = pago.mes.split('-');
                            const mesNombre = mesesNombres[parseInt(mes)] + ' ' + anio;
                            
                            return `
                        <tr>
                            <td>${new Date(pago.fecha_subida).toLocaleDateString('es-BO')}</td>
                            <td>${mesNombre}</td>
                        <td>Bs ${parseFloat(pago.monto).toFixed(2)}</td>
                        <td>${pago.estado === 'aprobado' ? '✅' : pago.estado === 'rechazado' ? '❌' : '⏳'}</td>
                    </tr>
                        `;
                    }).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
`;

const ventana = window.open('', '_blank');
ventana.document.write(html);
ventana.document.close();
}


/**
 * Exporta datos a Excel
 */
window.exportarExcel = async function(tipo) {
    try {
        Swal.fire({
            title: 'Exportando a Excel...',
            html: 'Preparando datos',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        let datos = [];
        let nombreArchivo = '';
        
        if (tipo === 'estudiantes') {
            const { data, error } = await supabase
                .from('estudiantes')
                .select(`
                    codigo,
                    nombre_completo,
                    nivel,
                    grado,
                    paralelo,
                    estado,
                    apoderados (nombre_completo, email, telefono)
                `)
                .order('nombre_completo'); // Ordena alfabéticamente por apellido (asumiendo formato "Apellido Nombre")
            
            if (error) throw error;
            
            datos = data.map(est => ({
                'Código': est.codigo,
                'Nombre Completo': est.nombre_completo,
                'Nivel': est.nivel,
                'Grado': est.grado || '',
                'Paralelo': est.paralelo || '',
                'Estado': est.estado,
                'Apoderado': est.apoderados ? est.apoderados.nombre_completo : '',
                'Email Apoderado': est.apoderados ? est.apoderados.email : '',
                'Teléfono': est.apoderados ? est.apoderados.telefono || '' : ''
            }));
            
            nombreArchivo = 'estudiantes_' + new Date().toISOString().split('T')[0] + '.xlsx';
            
        } else if (tipo === 'apoderados') {
            const { data, error } = await supabase
                .from('apoderados')
                .select(`
                    nombre_completo,
                    email,
                    telefono,
                    created_at,
                    estudiantes (nombre_completo)
                `)
                .order('nombre_completo');
            
            if (error) throw error;
            
            datos = data.map(apo => ({
                'Nombre Completo': apo.nombre_completo,
                'Email': apo.email,
                'Teléfono': apo.telefono || '',
                'Fecha Registro': new Date(apo.created_at).toLocaleDateString('es-BO'),
                'Cantidad Estudiantes': apo.estudiantes.length,
                'Estudiantes': apo.estudiantes.map(e => e.nombre_completo).join(', ')
            }));
            
            nombreArchivo = 'apoderados_' + new Date().toISOString().split('T')[0] + '.xlsx';
            
        } else if (tipo === 'pagos') {
            const { data, error } = await supabase
                .from('pagos')
                .select(`
                    fecha_subida,
                    mes,
                    monto,
                    estado,
                    apoderados (nombre_completo, email)
                `)
                .order('fecha_subida', { ascending: false });
            
            if (error) throw error;
            
            const mesesNombres = {
                '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
                '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
                '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
            };
            
            datos = data.map(pago => {
                const [anio, mes] = pago.mes.split('-');
                const mesNombre = mesesNombres[mes] + ' ' + anio;
                
                return {
                    'Fecha': new Date(pago.fecha_subida).toLocaleDateString('es-BO'),
                    'Apoderado': pago.apoderados ? pago.apoderados.nombre_completo : '',
                    'Email': pago.apoderados ? pago.apoderados.email : '',
                    'Mes': mesNombre,
                    'Monto': parseFloat(pago.monto).toFixed(2),
                    'Estado': pago.estado === 'aprobado' ? 'Aprobado' : pago.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'
                };
            });
            
            nombreArchivo = 'pagos_' + new Date().toISOString().split('T')[0] + '.xlsx';
        }
        
        // Crear archivo Excel usando XLSX
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Datos');
        
        // Descargar archivo
        XLSX.writeFile(wb, nombreArchivo);
        
        Swal.close();
        
        Swal.fire({
            icon: 'success',
            title: 'Exportado',
            text: `Archivo ${nombreArchivo} descargado exitosamente`
        });
        
    } catch (error) {
        console.error('❌ Error exportando a Excel:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo exportar el archivo'
        });
    }
};

// ========================================
// INICIALIZACIÓN
// ========================================
(async function init() {
    await cargarEstadisticas();
    await cargarEstudiantes();
    await cargarApoderadosReportes(); // Cargar apoderados para reportes
    
    console.log('✅ Dashboard administrativo inicializado');
})();
