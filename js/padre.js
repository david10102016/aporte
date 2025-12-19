// ========================================
// PANEL DE APODERADO - SUPABASE
// ========================================

import { initSupabase, getSupabase } from './supabase-config.js';
import { validarMonto } from './validaciones.js';
import { subirComprobante } from './cloudinary.js';

await initSupabase();
const supabase = getSupabase();

let apoderadoActual = null;
let hijosData = [];
let tarifasData = null;

// ========================================
// VERIFICAR AUTENTICACIÓN
// ========================================
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
    window.location.href = 'index.html';
}

console.log(' Padre autenticado:', session.user.email);

// ========================================
// CERRAR SESIÓN
// ========================================
document.getElementById('btnLogout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// ========================================
// NAVEGACIÓN ENTRE SECCIONES
// ========================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        const seccion = item.dataset.section;
        document.querySelectorAll('.section-content').forEach(section => {
            section.classList.remove('active');
        });
        
        const seccionMap = {
            'resumen': 'Resumen',
            'subir-pago': 'SubirPago',
            'historial': 'Historial',
            'mis-hijos': 'MisHijos'
        };
        
        const seccionId = seccionMap[seccion] || seccion;
        document.getElementById(`seccion${seccionId}`)?.classList.add('active');
    });
});

// ========================================
// CARGAR TARIFAS
// ========================================
async function cargarTarifas() {
    try {
        // Año escolar 2026 (Feb-Nov)
        const anioEscolar = 2026;
        const { data, error } = await supabase
            .from('tarifas')
            .select('*')
            .eq('anio', anioEscolar)
            .single();
        
        if (error) {
            console.warn('⚠️ No se encontraron tarifas para 2026:', error.message);
            tarifasData = { primaria: 0, secundaria: 0 };
        } else {
            tarifasData = data;
        }
        
        console.log('✅ Tarifas 2026 cargadas:', tarifasData);
    } catch (error) {
        console.error('❌ Error al cargar tarifas:', error);
        tarifasData = { primaria: 0, secundaria: 0 };
    }
}

// ========================================
// CARGAR DATOS DEL APODERADO
// ========================================
async function cargarDatosApoderado() {
    try {
        const { data, error } = await supabase
            .from('apoderados')
            .select('*')
            .eq('auth_id', session.user.id)
            .single();
        
        if (error) throw error;
        
        if (!data) {
            alert('Error: Apoderado no encontrado');
            await supabase.auth.signOut();
            window.location.href = 'index.html';
            return;
        }
        
        // Permitir acceso a todos los apoderados autenticados
        apoderadoActual = data;
        document.getElementById('nombreUsuario').textContent = apoderadoActual.nombre_completo;
        
        console.log(' Datos del apoderado cargados:', apoderadoActual);
        
    } catch (error) {
        console.error('Error al cargar datos del apoderado:', error);
        alert('Error al cargar datos. Por favor, intente nuevamente.');
    }
}

// ========================================
// CARGAR HIJOS
// ========================================
async function cargarHijos() {
    try {
        const { data, error } = await supabase
            .from('estudiantes')
            .select('*')
            .eq('apoderado_id', apoderadoActual.id)
            .order('nivel', { ascending: true });
        
        if (error) throw error;
        
        hijosData = data || [];
        renderHijos();
        
        console.log(' Hijos cargados:', hijosData.length);
        
    } catch (error) {
        console.error('Error al cargar hijos:', error);
    }
}

function renderHijos() {
    const container = document.getElementById('listaHijos');
    
    if (!container) return;
    
    if (hijosData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">No tienes hijos registrados</p>';
        return;
    }
    
    container.innerHTML = hijosData.map(hijo => `
        <div class="hijo-card">
            <div class="info">
                <strong>${hijo.nombre_completo}</strong>
                <span>${hijo.nivel} - ${hijo.grado}</span>
                <span style="color: #6b7280;">Código: ${hijo.codigo}</span>
            </div>
            <span class="badge badge-success">Activo</span>
        </div>
    `).join('');
}

// ========================================
// CARGAR RESUMEN
// ========================================
async function cargarResumen() {
    try {
        const primaria = hijosData.filter(h => h.nivel === 'Primaria').length;
        const secundaria = hijosData.filter(h => h.nivel === 'Secundaria').length;
        
        // Total mensual (con tarifas 2026)
        const totalPrimaria = primaria * parseFloat(tarifasData.primaria || 0);
        const totalSecundaria = secundaria * parseFloat(tarifasData.secundaria || 0);
        const totalMensual = totalPrimaria + totalSecundaria;
        
        // Total anual (10 meses: Feb-Nov)
        const totalAnual = totalMensual * 10;
        
        // Total pagado (todos los pagos aprobados del 2026)
        const { data: todosLosPagos } = await supabase
            .from('pagos')
            .select('monto')
            .eq('apoderado_id', apoderadoActual.id)
            .gte('mes', '2026-02')
            .lte('mes', '2026-11')
            .eq('estado', 'aprobado');
        
        const totalPagado = todosLosPagos?.reduce((sum, p) => sum + parseFloat(p.monto), 0) || 0;
        const saldoPendiente = totalAnual - totalPagado;
        
        // Actualizar UI
        document.getElementById('totalMes').textContent = `Bs ${totalMensual.toFixed(2)}`;
        document.getElementById('saldoPendiente').textContent = saldoPendiente >= 0 
            ? `Bs ${saldoPendiente.toFixed(2)}` 
            : `Bs ${Math.abs(saldoPendiente).toFixed(2)} (A favor)`;
        document.getElementById('totalHijos').textContent = hijosData.length;
        
        // Detalle por nivel
        const detalleContainer = document.getElementById('detalleNiveles');
        if (detalleContainer) {
            detalleContainer.innerHTML = `
                <div style="display: grid; gap: 1rem; margin-top: 1rem;">
                    ${primaria > 0 ? `
                    <div class="hijo-card">
                        <div class="info">
                            <strong>Primaria</strong>
                            <p>${primaria} estudiante(s) × Bs ${tarifasData.primaria} = Bs ${totalPrimaria.toFixed(2)}/mes</p>
                            <small style="color: #666;">Total anual: Bs ${(totalPrimaria * 10).toFixed(2)}</small>
                        </div>
                        <span class="badge badge-success">Activo</span>
                    </div>
                    ` : ''}
                    ${secundaria > 0 ? `
                    <div class="hijo-card">
                        <div class="info">
                            <strong>Secundaria</strong>
                            <p>${secundaria} estudiante(s) × Bs ${tarifasData.secundaria} = Bs ${totalSecundaria.toFixed(2)}/mes</p>
                            <small style="color: #666;">Total anual: Bs ${(totalSecundaria * 10).toFixed(2)}</small>
                        </div>
                        <span class="badge badge-success">Activo</span>
                    </div>
                    ` : ''}
                    <div style="background: #f0f9ff; padding: 1rem; border-radius: 8px; border-left: 4px solid #667eea;">
                        <strong>📊 Resumen Anual (2026)</strong>
                        <p style="margin-top: 0.5rem;">Total a pagar: Bs ${totalAnual.toFixed(2)}</p>
                        <p>Ya pagado: <span style="color: #10b981;">Bs ${totalPagado.toFixed(2)}</span></p>
                        <p style="font-size: 1.1rem; font-weight: bold; color: ${saldoPendiente >= 0 ? '#ef4444' : '#10b981'};">
                            ${saldoPendiente >= 0 ? 'Saldo pendiente' : 'Saldo a favor'}: Bs ${Math.abs(saldoPendiente).toFixed(2)}
                        </p>
                    </div>
                </div>
            `;
        }
        
        console.log('✅ Resumen calculado - Total mensual:', totalMensual, 'Total anual:', totalAnual, 'Pagado:', totalPagado, 'Pendiente:', saldoPendiente);
        
    } catch (error) {
        console.error('Error al cargar resumen:', error);
    }
}

// ========================================
// CARGAR HISTORIAL DE PAGOS
// ========================================
async function cargarHistorial() {
    try {
        const { data, error } = await supabase
            .from('pagos')
            .select('*')
            .eq('apoderado_id', apoderadoActual.id)
            .order('mes', { ascending: false });
        
        if (error) throw error;
        
        const tbody = document.getElementById('historialPagos');
        
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay pagos registrados</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(pago => {
            const estadoBadge = pago.estado === 'aprobado' ? 'badge-success' : 
                               pago.estado === 'rechazado' ? 'badge-danger' : 'badge-warning';
            const estadoTexto = pago.estado === 'aprobado' ? 'Aprobado' :
                               pago.estado === 'rechazado' ? 'Rechazado' : 'Pendiente';
            
            const fecha = new Date(pago.fecha_subida).toLocaleDateString('es-BO');
            
            return `
                <tr>
                    <td>${pago.mes}</td>
                    <td>Bs ${parseFloat(pago.monto).toFixed(2)}</td>
                    <td><span class="badge ${estadoBadge}">${estadoTexto}</span></td>
                    <td>${fecha}</td>
                    <td><a href="${pago.comprobante_url}" target="_blank" class="btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">Ver</a></td>
                </tr>
            `;
        }).join('');
        
        console.log(' Historial de pagos cargado:', data.length);
        
    } catch (error) {
        console.error('Error al cargar historial:', error);
    }
}

// ========================================
// SUBIR PAGO
// ========================================
const formPago = document.getElementById('formSubirPago');
if (formPago) {
    formPago.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mes = document.getElementById('mesPago').value;
        const monto = parseFloat(document.getElementById('montoPago').value);
        const archivo = document.getElementById('comprobante').files[0];
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        
        // Validar campos
        if (!mes || !monto || !archivo) {
            await Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Complete todos los campos y seleccione un comprobante',
                confirmButtonColor: '#667eea'
            });
            return;
        }
        
        // Validar monto
        if (!validarMonto(monto)) {
            await Swal.fire({
                icon: 'warning',
                title: 'Monto inválido',
                text: 'El monto debe ser mayor a 0',
                confirmButtonColor: '#667eea'
            });
            return;
        }
        
        // Validar archivo (imagen)
        if (!archivo.type.startsWith('image/')) {
            await Swal.fire({
                icon: 'warning',
                title: 'Archivo inválido',
                text: 'Solo se permiten imágenes (JPG, PNG, etc.)',
                confirmButtonColor: '#667eea'
            });
            return;
        }
        
        // Confirmar
        const confirmar = await Swal.fire({
            icon: 'question',
            title: '¿Subir comprobante?',
            html: `<p>Mes: <strong>${mes}</strong></p><p>Monto: <strong>Bs ${monto}</strong></p>`,
            showCancelButton: true,
            confirmButtonText: 'Sí, subir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#667eea',
            cancelButtonColor: '#6b7280'
        });
        
        if (!confirmar.isConfirmed) return;
        
        try {
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Subiendo...';
            
            // 1. Subir imagen a Cloudinary
            console.log('📤 Subiendo comprobante a Cloudinary...');
            const uploadResult = await subirComprobante(archivo);
            
            if (!uploadResult.success) {
                throw new Error(uploadResult.error);
            }
            
            console.log('✅ Imagen subida:', uploadResult.url);
            
            // 2. Guardar en base de datos
            const { error } = await supabase
                .from('pagos')
                .insert({
                    apoderado_id: apoderadoActual.id,
                    mes: mes,
                    monto: monto,
                    comprobante_url: uploadResult.url,
                    estado: 'pendiente'
                });
            
            if (error) throw error;
            
            await Swal.fire({
                icon: 'success',
                title: '¡Comprobante enviado!',
                text: 'Su pago está pendiente de verificación por el administrador',
                confirmButtonColor: '#667eea'
            });
            
            // Limpiar formulario y recargar historial
            formPago.reset();
            await cargarHistorial();
            
        } catch (error) {
            console.error('Error al subir pago:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo subir el comprobante',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Subir Comprobante';
        }
    });
}

// ========================================
// INICIALIZACIÓN
// ========================================
(async function init() {
    await cargarTarifas();
    await cargarDatosApoderado();
    
    if (apoderadoActual) {
        await cargarHijos();
        await cargarResumen();
        await cargarHistorial();
    }
    
    console.log(' Dashboard de padre inicializado');
})();
