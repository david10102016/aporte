// ========== VALIDACIONES DE CAMPOS ==========

// Validar teléfono (8 dígitos, solo números)
export function validarTelefono(telefono) {
    const regex = /^[0-9]{8}$/;
    return regex.test(telefono);
}

// Validar email (formato válido o vacío)
export function validarEmail(email) {
    if (email === '') return true;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Validar nombre (solo letras, espacios y tildes)
export function validarNombre(nombre) {
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return regex.test(nombre) && nombre.length >= 3;
}

// Alias para validarNombre (compatibilidad)
export function validarNombreCompleto(nombre) {
    return validarNombre(nombre);
}

// Validar código de estudiante (4 caracteres alfanuméricos)
export function validarCodigo(codigo) {
    const regex = /^[A-Z0-9]{4}$/;
    return regex.test(codigo);
}

// Validar monto (número positivo)
export function validarMonto(monto) {
    const numero = parseFloat(monto);
    return !isNaN(numero) && numero > 0;
}

// Validar archivo (imagen)
export function validarImagen(archivo) {
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const tamanoMaximo = 5 * 1024 * 1024;
    
    if (!tiposPermitidos.includes(archivo.type)) {
        return { valido: false, mensaje: 'Solo se permiten imágenes (JPG, PNG, GIF)' };
    }
    
    if (archivo.size > tamanoMaximo) {
        return { valido: false, mensaje: 'La imagen no debe superar 5 MB' };
    }
    
    return { valido: true, mensaje: '' };
}

// Generar código único de 4 caracteres
export function generarCodigo() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';
    for (let i = 0; i < 4; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

// Validar campos en tiempo real
export function aplicarValidacionEnTiempoReal() {
    const telefonoInputs = document.querySelectorAll('input[type="text"][id*="telefono"]');
    telefonoInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    });
    
    const nombreInputs = document.querySelectorAll('input[type="text"][id*="nombre"]');
    nombreInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        });
    });
    
    const codigoInputs = document.querySelectorAll('.codigo-hijo');
    codigoInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarValidacionEnTiempoReal);
} else {
    aplicarValidacionEnTiempoReal();
}