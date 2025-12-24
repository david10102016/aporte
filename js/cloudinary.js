// ========== CLOUDINARY - SUBIDA DE IMÁGENES CON OPTIMIZACIÓN ==========

const CLOUD_NAME = 'dcme161bf';
const UPLOAD_PRESET = 'comprobantes';

/**
 * Comprime y optimiza imagen antes de subirla
 * Acepta: JPEG, PNG, WebP, BMP, GIF
 * Convierte todo a JPEG optimizado
 * 
 * @param {File} archivo - Archivo de imagen original
 * @param {number} maxWidth - Ancho máximo en píxeles (default: 1500)
 * @param {number} quality - Calidad JPEG 0-1 (default: 0.85)
 * @returns {Promise<File>} Archivo comprimido
 */
export async function comprimirImagen(archivo, maxWidth = 1500, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calcular nuevo tamaño manteniendo aspect ratio
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Dibujar imagen redimensionada
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir a Blob con compresión JPEG
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            // Crear archivo comprimido manteniendo nombre original
                            const nombreSinExtension = archivo.name.replace(/\.[^/.]+$/, "");
                            const archivoComprimido = new File(
                                [blob], 
                                `${nombreSinExtension}.jpg`, 
                                { type: 'image/jpeg' }
                            );
                            resolve(archivoComprimido);
                        } else {
                            reject(new Error('Error al comprimir imagen'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            
            img.onerror = () => reject(new Error('Error al cargar imagen'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('Error al leer archivo'));
        reader.readAsDataURL(archivo);
    });
}

/**
 * Sube comprobante a Cloudinary con optimización automática
 * @param {File} archivo - Archivo original (cualquier formato de imagen)
 * @returns {Promise<Object>} Resultado de la subida
 */
export async function subirComprobante(archivo) {
    try {
        // Mostrar tamaño original
        const tamanoOriginalMB = (archivo.size / 1024 / 1024).toFixed(2);
        console.log(`📦 Tamaño original: ${tamanoOriginalMB} MB (${archivo.type})`);
        
        // Comprimir imagen antes de subir
        console.log('🔄 Comprimiendo imagen...');
        const archivoComprimido = await comprimirImagen(archivo, 1500, 0.85);
        
        const tamanoComprimidoMB = (archivoComprimido.size / 1024 / 1024).toFixed(2);
        const ahorroMB = (tamanoOriginalMB - tamanoComprimidoMB).toFixed(2);
        const ahorroPorcentaje = ((1 - archivoComprimido.size / archivo.size) * 100).toFixed(1);
        
        console.log(`✅ Tamaño comprimido: ${tamanoComprimidoMB} MB`);
        console.log(`💾 Ahorro: ${ahorroMB} MB (${ahorroPorcentaje}%)`);
        
        // Subir archivo comprimido a Cloudinary
        console.log('☁️ Subiendo a Cloudinary...');
        const formData = new FormData();
        formData.append('file', archivoComprimido);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'comprobantes');
        
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            { method: 'POST', body: formData }
        );
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error al subir imagen');
        }
        
        const data = await response.json();
        
        console.log('✅ Imagen subida exitosamente');
        
        return {
            success: true,
            url: data.secure_url,
            publicId: data.public_id,
            estadisticas: {
                tamanoOriginal: `${tamanoOriginalMB} MB`,
                tamanoFinal: `${tamanoComprimidoMB} MB`,
                ahorro: `${ahorroMB} MB (${ahorroPorcentaje}%)`,
                formatoOriginal: archivo.type,
                formatoFinal: 'image/jpeg'
            }
        };
        
    } catch (error) {
        console.error('❌ Error en Cloudinary:', error);
        return { 
            success: false, 
            error: error.message || 'Error desconocido al subir imagen'
        };
    }
}

/**
 * Previsualiza imagen antes de subirla
 * @param {File} archivo - Archivo de imagen
 * @param {string} contenedorId - ID del elemento donde mostrar preview
 */
export function previsualizarImagen(archivo, contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const tamanoKB = (archivo.size / 1024).toFixed(2);
        const tamanoMB = (archivo.size / 1024 / 1024).toFixed(2);
        const tamaño = archivo.size > 1024 * 1024 ? `${tamanoMB} MB` : `${tamanoKB} KB`;
        
        contenedor.innerHTML = `
            <div style="text-align: center;">
                <img src="${e.target.result}" 
                     alt="Preview" 
                     style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <p style="margin-top: 10px; font-size: 0.9rem; color: #6b7280;">
                    📄 ${archivo.name}<br>
                    📦 Tamaño: ${tamaño}
                    ${archivo.size > 1024 * 1024 ? '<br>🔄 <span style="color: #10b981;">Se optimizará al subir</span>' : ''}
                </p>
            </div>
        `;
    };
    reader.readAsDataURL(archivo);
}

/**
 * Valida que el archivo sea una imagen válida
 * @param {File} archivo - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
export function validarImagen(archivo) {
    const tiposPermitidos = [
        'image/jpeg', 
        'image/jpg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        'image/bmp'
    ];
    const tamanoMaximo = 10 * 1024 * 1024; // 10 MB (se optimizará de todas formas)
    
    if (!tiposPermitidos.includes(archivo.type)) {
        return { 
            valido: false, 
            mensaje: 'Solo se permiten imágenes (JPG, PNG, GIF, WebP, BMP)' 
        };
    }
    
    if (archivo.size > tamanoMaximo) {
        return { 
            valido: false, 
            mensaje: 'La imagen no debe superar 10 MB' 
        };
    }
    
    return { valido: true, mensaje: '' };
}