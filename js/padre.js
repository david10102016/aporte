// ========================================
// PANEL DE APODERADO - SUPABASE
// ========================================

import { initSupabase, getSupabase } from './supabase-config.js';
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
        container.innerHTML = '<p style="text-align:center; color:#4b5563;">No tienes hijos registrados</p>';
        return;
    }
    
    container.innerHTML = hijosData.map(hijo => `
        <div class="hijo-card" style="color:#1f2937;">
            <div class="info">
                <strong style="color:#1f2937;">${hijo.nombre_completo}</strong>
                <span>${hijo.nivel} - ${hijo.grado}</span>
                <span style="color: #4b5563;">Código: ${hijo.codigo}</span>
            </div>
            <span class="badge badge-success">Activo</span>
        </div>
    `).join('');

    // Botón para agregar otro hijo
    container.insertAdjacentHTML('beforeend', `
        <button id="btnAgregarHijo" style="margin-top:1rem;width:100%;padding:0.75rem;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1rem;font-weight:600;">
            + Agregar otro hijo
        </button>
    `);

    document.getElementById('btnAgregarHijo').addEventListener('click', agregarOtroHijo);
}

/**
 * Flujo para agregar otro hijo desde el dashboard del padre
 */
async function agregarOtroHijo() {
    // Paso 1: Pedir código
    const { value: codigo } = await Swal.fire({
        title: 'Agregar otro hijo',
        input: 'text',
        inputLabel: 'Ingrese el código de 4 caracteres del estudiante',
        inputPlaceholder: 'Ej: A3B7',
        inputAttributes: { maxlength: 4, style: 'text-transform:uppercase; text-align:center; font-size:1.2rem; letter-spacing:0.3rem;' },
        showCancelButton: true,
        confirmButtonText: 'Buscar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#667eea',
        inputValidator: (value) => {
            if (!value) return 'Debe ingresar un código';
            if (!/^[A-Za-z0-9]{4}$/.test(value)) return 'El código debe tener 4 caracteres alfanuméricos';
        }
    });

    if (!codigo) return;

    const codigoUpper = codigo.toUpperCase();

    // Verificar si ya es hijo del apoderado
    if (hijosData.some(h => h.codigo === codigoUpper)) {
        await Swal.fire({ icon: 'info', title: 'Ya registrado', text: 'Este estudiante ya está en tu lista de hijos', confirmButtonColor: '#667eea' });
        return;
    }

    try {
        // Paso 2: Buscar estudiante
        Swal.fire({ title: 'Buscando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const { data, error } = await supabase
            .from('estudiantes')
            .select('*')
            .eq('codigo', codigoUpper)
            .maybeSingle();

        Swal.close();

        if (error) {
            await Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonColor: '#ef4444' });
            return;
        }

        if (!data) {
            await Swal.fire({ icon: 'warning', title: 'No encontrado', text: 'El código no existe. Verifique con el colegio.', confirmButtonColor: '#667eea' });
            return;
        }

        if (data.estado === 'asignado') {
            await Swal.fire({ icon: 'warning', title: 'No disponible', text: `Este estudiante ya está asignado a: ${data.apoderado_nombre}`, confirmButtonColor: '#667eea' });
            return;
        }

        // Paso 3: Confirmar
        const confirmar = await Swal.fire({
            icon: 'question',
            title: '¿Es tu hijo/a?',
            html: `<p><strong>${data.nombre_completo}</strong></p><p>${data.nivel} - ${data.grado}</p>`,
            showCancelButton: true,
            confirmButtonText: 'Sí, agregar',
            cancelButtonText: 'No, cancelar',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444'
        });

        if (!confirmar.isConfirmed) return;

        // Paso 4: Asignar
        Swal.fire({ title: 'Asignando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const { data: updateData, error: updateError } = await supabase
            .from('estudiantes')
            .update({
                apoderado_id: apoderadoActual.id,
                apoderado_nombre: apoderadoActual.nombre_completo,
                estado: 'asignado'
            })
            .eq('codigo', codigoUpper)
            .select();

        if (updateError) {
            Swal.close();
            await Swal.fire({ icon: 'error', title: 'Error', text: updateError.message, confirmButtonColor: '#ef4444' });
            return;
        }

        // Paso 5: Recalcular total mensual
        await supabase.rpc('calcular_total_mensual', { apoderado_uuid: apoderadoActual.id });

        // Paso 6: Recargar datos ANTES de mostrar el éxito
        await cargarHijos();
        renderSelectorHijos();
        await cargarResumen();

        Swal.close();

        await Swal.fire({
            icon: 'success',
            title: '¡Hijo agregado!',
            html: `<p><strong>${data.nombre_completo}</strong> ha sido vinculado a tu cuenta</p>`,
            confirmButtonColor: '#667eea'
        });

    } catch (err) {
        console.error('Error al agregar hijo:', err);
        await Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'No se pudo agregar el hijo', confirmButtonColor: '#ef4444' });
    }
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
                            <small style="color: #4b5563;">Total anual: Bs ${(totalPrimaria * 10).toFixed(2)}</small>
                        </div>
                        <span class="badge badge-success">Activo</span>
                    </div>
                    ` : ''}
                    ${secundaria > 0 ? `
                    <div class="hijo-card">
                        <div class="info">
                            <strong>Secundaria</strong>
                            <p>${secundaria} estudiante(s) × Bs ${tarifasData.secundaria} = Bs ${totalSecundaria.toFixed(2)}/mes</p>
                            <small style="color: #4b5563;">Total anual: Bs ${(totalSecundaria * 10).toFixed(2)}</small>
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

/**
 * Renderizar selector de hijos con checkboxes
 */
function renderSelectorHijos() {
    const container = document.getElementById('selectorHijos');
    if (!container) return;

    if (hijosData.length === 0) {
        container.innerHTML = '<p style="color:#4b5563;">No tienes hijos registrados</p>';
        return;
    }

    container.innerHTML = hijosData.map(hijo => {
        const tarifa = hijo.nivel === 'Primaria' 
            ? parseFloat(tarifasData.primaria || 0) 
            : parseFloat(tarifasData.secundaria || 0);
        return `
            <label style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem; background:#f8fafc; border:2px solid #e2e8f0; border-radius:8px; cursor:pointer; transition: all 0.2s;" 
                   onmouseover="this.style.borderColor='#667eea'" onmouseout="if(!this.querySelector('input').checked) this.style.borderColor='#e2e8f0'">
                <input type="checkbox" class="hijo-checkbox" value="${hijo.id}" 
                       data-nivel="${hijo.nivel}" data-tarifa="${tarifa}" 
                       data-nombre="${hijo.nombre_completo}"
                       style="width:1.2rem; height:1.2rem; accent-color:#667eea;">
                <div style="flex:1;">
                    <strong style="color:#1f2937;">${hijo.nombre_completo}</strong><br>
                    <small style="color:#4b5563;">${hijo.nivel} - ${hijo.grado}</small>
                </div>
                <span style="font-weight:bold; color:#667eea;">Bs ${tarifa.toFixed(2)}</span>
            </label>
        `;
    }).join('');

    // Agregar eventos para recalcular monto
    container.querySelectorAll('.hijo-checkbox').forEach(cb => {
        cb.addEventListener('change', recalcularMonto);
    });
}

/**
 * Recalcular monto total según hijos seleccionados
 */
function recalcularMonto() {
    const checkboxes = document.querySelectorAll('.hijo-checkbox:checked');
    let total = 0;
    checkboxes.forEach(cb => {
        total += parseFloat(cb.dataset.tarifa);
    });
    const montoInput = document.getElementById('montoTotal');
    if (montoInput) {
        montoInput.value = `Bs ${total.toFixed(2)}`;
    }

    // Resaltar visualmente los seleccionados
    document.querySelectorAll('.hijo-checkbox').forEach(cb => {
        const label = cb.closest('label');
        if (cb.checked) {
            label.style.borderColor = '#667eea';
            label.style.background = '#eef2ff';
        } else {
            label.style.borderColor = '#e2e8f0';
            label.style.background = '#f8fafc';
        }
    });
}

/**
 * Obtener hijos seleccionados con su tarifa
 */
function obtenerHijosSeleccionados() {
    const checkboxes = document.querySelectorAll('.hijo-checkbox:checked');
    return Array.from(checkboxes).map(cb => ({
        id: cb.value,
        nombre: cb.dataset.nombre,
        nivel: cb.dataset.nivel,
        tarifa: parseFloat(cb.dataset.tarifa)
    }));
}

const formPago = document.getElementById('formSubirPago');
if (formPago) {
    formPago.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('SUBMIT ejecutado');
        console.log('Mes seleccionado:', document.getElementById('mesPago')?.value);
        
        const mes = document.getElementById('mesPago').value;
        const archivo = document.getElementById('comprobante').files[0];
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        const hijosSeleccionados = obtenerHijosSeleccionados();
        
        // Validar mes
        if (!mes) {
            await Swal.fire({
                icon: 'warning',
                title: 'Seleccione un mes',
                text: 'Debe seleccionar el mes a pagar',
                confirmButtonColor: '#667eea'
            });
            return;
        }

        // Validar que al menos un hijo esté seleccionado
        if (hijosSeleccionados.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Seleccione al menos un hijo',
                text: 'Debe marcar los hijos por los que desea pagar',
                confirmButtonColor: '#667eea'
            });
            return;
        }

        // Validar archivo (imagen)
        if (!archivo) {
            await Swal.fire({
                icon: 'warning',
                title: 'Comprobante requerido',
                text: 'Debe seleccionar una imagen del comprobante',
                confirmButtonColor: '#667eea'
            });
            return;
        }

        if (!archivo.type.startsWith('image/')) {
            await Swal.fire({
                icon: 'warning',
                title: 'Archivo inválido',
                text: 'Solo se permiten imágenes (JPG, PNG, etc.)',
                confirmButtonColor: '#667eea'
            });
            return;
        }
        
        // Calcular total
        const montoTotal = hijosSeleccionados.reduce((sum, h) => sum + h.tarifa, 0);

        // Construir detalle para confirmación
        const detalleHtml = hijosSeleccionados.map(h => 
            `<p>• ${h.nombre} (${h.nivel}): <strong>Bs ${h.tarifa.toFixed(2)}</strong></p>`
        ).join('');

        // Confirmar
        const confirmar = await Swal.fire({
            icon: 'question',
            title: '¿Subir comprobante?',
            html: `
                <p style="margin-bottom:0.5rem;">Mes: <strong>${mes}</strong></p>
                <hr style="margin:0.5rem 0;">
                ${detalleHtml}
                <hr style="margin:0.5rem 0;">
                <p style="font-size:1.1rem;">Total: <strong>Bs ${montoTotal.toFixed(2)}</strong></p>
            `,
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
            
            // 2. Guardar un registro de pago por cada hijo seleccionado
            const registros = hijosSeleccionados.map(hijo => ({
                apoderado_id: apoderadoActual.id,
                mes: mes,
                monto: hijo.tarifa,
                comprobante_url: uploadResult.url,
                estado: 'pendiente'
            }));

            const { error } = await supabase
                .from('pagos')
                .insert(registros);
            
            if (error) throw error;
            
            await Swal.fire({
                icon: 'success',
                title: '¡Comprobante enviado!',
                html: `<p>${hijosSeleccionados.length} pago(s) registrado(s) por Bs ${montoTotal.toFixed(2)}</p><p>Pendiente de verificación por el administrador</p>`,
                confirmButtonColor: '#667eea'
            });
            
            // Limpiar formulario y recargar historial
            formPago.reset();
            document.querySelectorAll('.hijo-checkbox').forEach(cb => cb.checked = false);
            recalcularMonto();
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
        renderSelectorHijos();
        await cargarResumen();
        await cargarHistorial();
    }
    
    console.log(' Dashboard de padre inicializado');
})();
