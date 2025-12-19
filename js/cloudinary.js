// ========== CLOUDINARY - SUBIDA DE IMÁGENES ==========

const CLOUD_NAME = 'dcme161bf';
const UPLOAD_PRESET = 'comprobantes';

export async function subirComprobante(archivo) {
    try {
        const formData = new FormData();
        formData.append('file', archivo);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'comprobantes');
        
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            { method: 'POST', body: formData }
        );
        
        if (!response.ok) throw new Error('Error al subir imagen');
        
        const data = await response.json();
        
        return {
            success: true,
            url: data.secure_url,
            publicId: data.public_id
        };
        
    } catch (error) {
        console.error('Error en Cloudinary:', error);
        return { success: false, error: error.message };
    }
}

export function previsualizarImagen(archivo, contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        contenedor.innerHTML = `
            <img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
            <p style="margin-top: 10px; font-size: 0.9rem; color: #6b7280;">
                ${archivo.name} (${(archivo.size / 1024).toFixed(2)} KB)
            </p>
        `;
    };
    reader.readAsDataURL(archivo);
}

export function validarImagen(archivo) {
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const tamanoMaximo = 5 * 1024 * 1024;
    
    if (!tiposPermitidos.includes(archivo.type)) {
        return { valido: false, mensaje: 'Solo se permiten imágenes JPG, PNG o GIF' };
    }
    
    if (archivo.size > tamanoMaximo) {
        return { valido: false, mensaje: 'La imagen no debe superar 5 MB' };
    }
    
    return { valido: true, mensaje: '' };
}