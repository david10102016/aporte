// ========================================
// REGISTRO DE APODERADOS - SUPABASE
// ========================================

import { initSupabase, getSupabase } from './supabase-config.js';
import { validarNombreCompleto, validarTelefono, validarEmail } from './validaciones.js';

await initSupabase();
const supabase = getSupabase();

// Variables globales
let codigosValidados = [];

// ========================================
// AGREGAR/REMOVER CAMPOS DE HIJOS
// ========================================
document.getElementById('btnAgregarHijo').addEventListener('click', () => {
    const container = document.getElementById('hijosContainer');
    const nuevoHijo = document.createElement('div');
    nuevoHijo.className = 'form-group hijo-item';
    nuevoHijo.innerHTML = `
        <label>Código del estudiante</label>
        <div class="codigo-input-group">
            <input type="text" class="codigo-hijo" placeholder="A3B7" maxlength="4" required>
            <button type="button" class="btn-buscar-codigo">Buscar</button>
            <button type="button" class="btn-remover-hijo" style="background: #ef4444;">✕</button>
        </div>
        <div class="estudiante-info"></div>
        <span class="error-message error-codigo"></span>
    `;
    container.appendChild(nuevoHijo);
    
    // Agregar evento al botón de remover
    nuevoHijo.querySelector('.btn-remover-hijo')?.addEventListener('click', () => {
        nuevoHijo.remove();
    });
    
    // Agregar evento al botón de buscar
    nuevoHijo.querySelector('.btn-buscar-codigo')?.addEventListener('click', function() {
        buscarEstudiante(this);
    });
});

// ========================================
// BUSCAR ESTUDIANTE POR CÓDIGO
// ========================================
document.querySelectorAll('.btn-buscar-codigo').forEach(btn => {
    btn.addEventListener('click', function() {
        buscarEstudiante(this);
    });
});

async function buscarEstudiante(btnElement) {
    const hijoItem = btnElement.closest('.hijo-item');
    const inputCodigo = hijoItem.querySelector('.codigo-hijo');
    const infoDiv = hijoItem.querySelector('.estudiante-info');
    const errorSpan = hijoItem.querySelector('.error-codigo');
    
    const codigo = inputCodigo.value.trim().toUpperCase();
    
    errorSpan.textContent = '';
    infoDiv.innerHTML = '';
    
    // Validar formato: 4 caracteres alfanuméricos
    if (!/^[A-Z0-9]{4}$/.test(codigo)) {
        errorSpan.textContent = 'El código debe tener 4 caracteres (letras y números)';
        return;
    }
    
    try {
        btnElement.textContent = 'Buscando...';
        btnElement.disabled = true;
        
        // Buscar estudiante en Supabase
        const { data, error } = await supabase
            .from('estudiantes')
            .select('*')
            .eq('codigo', codigo)
            .maybeSingle();
        
        if (error) {
            console.error('Error al buscar estudiante:', error);
            errorSpan.textContent = 'Error al buscar código: ' + error.message;
            btnElement.textContent = 'Buscar';
            btnElement.disabled = false;
            return;
        }
        
        if (!data) {
            errorSpan.textContent = 'Código no encontrado. Verifique con el colegio.';
            btnElement.textContent = 'Buscar';
            btnElement.disabled = false;
            return;
        }
        
        // Verificar si ya está asignado
        if (data.estado === 'asignado') {
            errorSpan.textContent = `Este estudiante ya está asignado a: ${data.apoderado_nombre}`;
            btnElement.textContent = 'Buscar';
            btnElement.disabled = false;
            return;
        }
        
        // Verificar si ya fue agregado
        if (codigosValidados.includes(codigo)) {
            errorSpan.textContent = 'Este código ya fue agregado';
            btnElement.textContent = 'Buscar';
            btnElement.disabled = false;
            return;
        }
        
        // Mostrar información del estudiante
        infoDiv.innerHTML = `
            <div style="background: #d1fae5; padding: 0.75rem; border-radius: 6px; margin-top: 0.5rem;">
                <strong>✓ Estudiante encontrado:</strong><br>
                <strong>${data.nombre_completo}</strong><br>
                ${data.nivel} - ${data.grado}
            </div>
        `;

        // Confirmar que es su hijo
        const confirmar = await Swal.fire({
            icon: 'question',
            title: '¿Es tu hijo/a?',
            html: `<p><strong>${data.nombre_completo}</strong></p><p>${data.nivel} - ${data.grado}</p>`,
            showCancelButton: true,
            confirmButtonText: 'Sí, es mi hijo/a',
            cancelButtonText: 'No, es otro',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444'
        });

        if (!confirmar.isConfirmed) {
            infoDiv.innerHTML = '';
            inputCodigo.value = '';
            btnElement.textContent = 'Buscar';
            btnElement.disabled = false;
            return;
        }
        
        // Guardar código validado
        codigosValidados.push(codigo);
        inputCodigo.disabled = true;
        btnElement.textContent = '✓';
        btnElement.style.background = '#10b981';
        
        console.log('✅ Estudiante validado:', data);
        
    } catch (error) {
        console.error('Error al buscar estudiante:', error);
        errorSpan.textContent = 'Error al buscar. Intente nuevamente.';
        btnElement.textContent = 'Buscar';
        btnElement.disabled = false;
    }
}

// ========================================
// FORMULARIO DE REGISTRO
// ========================================
document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Obtener valores
    const nombreCompleto = document.getElementById('nombreCompleto').value.trim();
    const telefono = document.getElementById('telefonoRegistro').value.trim();
    const email = document.getElementById('emailRegistro').value.trim();
    const password = document.getElementById('passwordRegistro').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Limpiar errores
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    
    // Validar campos
    let hayErrores = false;
    
    if (!validarNombreCompleto(nombreCompleto)) {
        document.getElementById('errorNombre').textContent = 'Nombre inválido (solo letras y espacios)';
        hayErrores = true;
    }
    
    if (!validarTelefono(telefono)) {
        document.getElementById('errorTelefonoReg').textContent = 'Teléfono inválido (8 dígitos)';
        hayErrores = true;
    }
    
    if (email && !validarEmail(email)) {
        document.getElementById('errorEmail').textContent = 'Email inválido';
        hayErrores = true;
    }
    
    if (password.length < 6) {
        document.getElementById('errorPass').textContent = 'Mínimo 6 caracteres';
        hayErrores = true;
    }
    
    if (password !== confirmPassword) {
        document.getElementById('errorConfirm').textContent = 'Las contraseñas no coinciden';
        hayErrores = true;
    }
    
    // Validar que al menos un hijo esté validado
    if (codigosValidados.length === 0) {
        document.getElementById('errorRegistro').textContent = 'Debe validar al menos un código de estudiante';
        hayErrores = true;
    }
    
    if (hayErrores) return;
    
    // Procesar registro
    try {
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        
        // Prevenir múltiples envíos
        if (btnSubmit.disabled) {
            console.log('⚠️ Registro en proceso, por favor espere...');
            return;
        }
        
        btnSubmit.textContent = 'Procesando...';
        btnSubmit.disabled = true;
        
        // Determinar email para Supabase Auth
        // Usar mailinator (dominio de emails temporales que Supabase acepta)
        const emailAuth = email || `${telefono}@mailinator.com`;
        
        console.log('📝 Registrando usuario con email:', emailAuth);
        
        // Pequeño delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 1. Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: emailAuth,
            password: password,
            options: {
                emailRedirectTo: window.location.origin,
                data: {
                    nombre_completo: nombreCompleto,
                    telefono: telefono
                }
            }
        });
        
        if (authError) {
            if (authError.message.includes('already registered')) {
                throw new Error('Este email o teléfono ya está registrado');
            }
            throw authError;
        }
        
        console.log('✅ Usuario creado en Supabase Auth:', authData.user.id);
        
        // 2. Insertar en tabla apoderados (estado activo inmediatamente)
        const { data: apoderadoData, error: apoderadoError } = await supabase
            .from('apoderados')
            .insert({
                auth_id: authData.user.id,
                nombre_completo: nombreCompleto,
                telefono: telefono,
                email: email || null,
                estado: 'activo'  // ← Activo de inmediato
            })
            .select()
            .single();
        
        if (apoderadoError) throw apoderadoError;
        
        console.log('✅ Apoderado creado:', apoderadoData.id);
        
        // 3. Asignar estudiantes automáticamente al apoderado
        let estudiantesAsignados = 0;
        for (const codigo of codigosValidados) {
            console.log(`📌 Asignando estudiante ${codigo}...`);
            
            const { data: updateData, error: asignarError } = await supabase
                .from('estudiantes')
                .update({
                    apoderado_id: apoderadoData.id,
                    apoderado_nombre: nombreCompleto,
                    estado: 'asignado'
                })
                .eq('codigo', codigo)
                .select();
            
            if (asignarError) {
                console.error('❌ Error al asignar estudiante:', codigo, asignarError);
                throw new Error(`No se pudo asignar el estudiante ${codigo}: ${asignarError.message}`);
            }
            
            if (updateData && updateData.length > 0) {
                estudiantesAsignados++;
                console.log(`✅ Estudiante ${codigo} asignado correctamente`);
            } else {
                console.warn(`⚠️ Estudiante ${codigo} no encontrado para actualizar`);
            }
        }
        
        console.log(`✅ Total estudiantes asignados: ${estudiantesAsignados}/${codigosValidados.length}`);
        
        // 4. Calcular total mensual
        console.log('💰 Calculando total mensual...');
        const { data: totalData, error: calcularError } = await supabase.rpc('calcular_total_mensual', {
            apoderado_uuid: apoderadoData.id
        });
        
        if (calcularError) {
            console.error('❌ Error al calcular total mensual:', calcularError);
            throw new Error(`No se pudo calcular el total mensual: ${calcularError.message}`);
        }
        
        console.log('✅ Total mensual calculado:', totalData);
        
        // 5. Mostrar mensaje de éxito con SweetAlert2
        await Swal.fire({
            icon: 'success',
            title: '¡Registro completado!',
            html: '<p>Tu cuenta ha sido activada exitosamente.</p><p style="margin-top: 1rem;"><strong>Ya puedes iniciar sesión</strong> con tu número de teléfono.</p>',
            confirmButtonText: 'Ir a iniciar sesión',
            confirmButtonColor: '#667eea',
            allowOutsideClick: false
        });
        
        // Cerrar sesión y redirigir al login
        await supabase.auth.signOut();
        
        // Redirigir al login
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Error en registro:', error);
        document.getElementById('errorRegistro').textContent = error.message || 'Error al procesar registro. Intente nuevamente.';
        
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.textContent = 'Enviar Solicitud';
        btnSubmit.disabled = false;
    }
});

console.log('✅ Módulo de registro cargado');
