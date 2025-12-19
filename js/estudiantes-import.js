// ========================================
// MÓDULO: IMPORTACIÓN DE ESTUDIANTES DESDE EXCEL
// ========================================

import { getSupabase } from './supabase-config.js';

// Obtener instancia de Supabase
const supabase = getSupabase();

// Librería para procesar Excel (se carga desde CDN en el HTML)
// <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>

/**
 * Genera código secuencial de 4 dígitos
 */
async function generarCodigoSecuencial() {
    try {
        // Obtener todos los códigos numéricos existentes
        const { data, error } = await supabase
            .from('estudiantes')
            .select('codigo');
        
        if (error) {
            console.error('Error al obtener códigos:', error);
            return '0001';
        }
        
        if (!data || data.length === 0) {
            console.log('No hay estudiantes, empezando desde 0001');
            return '0001';
        }
        
        // Extraer todos los códigos numéricos y encontrar el máximo
        const codigosNumericos = data
            .map(est => parseInt(est.codigo))
            .filter(codigo => !isNaN(codigo))
            .sort((a, b) => b - a);
        
        const maxCodigo = codigosNumericos.length > 0 ? codigosNumericos[0] : 0;
        const nuevoCodigo = (maxCodigo + 1).toString().padStart(4, '0');
        
        console.log(`Último código: ${maxCodigo}, Nuevo código: ${nuevoCodigo}`);
        
        return nuevoCodigo;
    } catch (error) {
        console.error('Error en generarCodigoSecuencial:', error);
        return '0001';
    }
}

/**
 * Procesa archivo Excel y retorna array de estudiantes
 */
export async function procesarArchivoExcel(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Leer la primera hoja
                const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
                const datosJson = XLSX.utils.sheet_to_json(primeraHoja);
                
                if (datosJson.length === 0) {
                    reject(new Error('El archivo Excel está vacío'));
                    return;
                }
                
                // Validar y transformar datos
                const estudiantes = [];
                const errores = [];
                let codigoActual = await generarCodigoSecuencial();
                
                for (let i = 0; i < datosJson.length; i++) {
                    const row = datosJson[i];
                    const numFila = i + 2; // +2 porque Excel empieza en 1 y tiene header
                    
                    // Validaciones obligatorias
                    if (!row.nombre_completo && !row['Nombre Completo'] && !row.nombre) {
                        errores.push(`Fila ${numFila}: Falta nombre completo`);
                        continue;
                    }
                    
                    const nombre = row.nombre_completo || row['Nombre Completo'] || row.nombre;
                    const nivel = row.nivel || row.Nivel;
                    
                    if (!nivel) {
                        errores.push(`Fila ${numFila}: Falta nivel (Primaria/Secundaria)`);
                        continue;
                    }
                    
                    if (!['Primaria', 'Secundaria', 'primaria', 'secundaria'].includes(nivel)) {
                        errores.push(`Fila ${numFila}: Nivel debe ser "Primaria" o "Secundaria"`);
                        continue;
                    }
                    
                    // Normalizar nivel
                    const nivelNormalizado = nivel.charAt(0).toUpperCase() + nivel.slice(1).toLowerCase();
                    
                    // Crear objeto estudiante
                    estudiantes.push({
                        codigo: codigoActual,
                        nombre_completo: nombre.trim(),
                        nivel: nivelNormalizado,
                        grado: row.grado || row.Grado || null,
                        paralelo: row.paralelo || row.Paralelo || null,
                        estado: 'disponible'
                    });
                    
                    // Incrementar código para el siguiente
                    codigoActual = (parseInt(codigoActual) + 1).toString().padStart(4, '0');
                }
                
                resolve({ estudiantes, errores });
                
            } catch (error) {
                reject(new Error(`Error al procesar Excel: ${error.message}`));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Error al leer el archivo'));
        };
        
        reader.readAsArrayBuffer(archivo);
    });
}

/**
 * Importa estudiantes a la base de datos
 */
export async function importarEstudiantes(estudiantes) {
    const resultados = {
        exitosos: 0,
        fallidos: 0,
        errores: []
    };
    
    // Importar en lotes de 50 para no saturar
    const tamañoLote = 50;
    
    for (let i = 0; i < estudiantes.length; i += tamañoLote) {
        const lote = estudiantes.slice(i, i + tamañoLote);
        
        const { data, error } = await supabase
            .from('estudiantes')
            .insert(lote)
            .select();
        
        if (error) {
            console.error('Error en lote:', error);
            resultados.fallidos += lote.length;
            resultados.errores.push(`Lote ${i / tamañoLote + 1}: ${error.message}`);
        } else {
            resultados.exitosos += data.length;
        }
    }
    
    return resultados;
}

/**
 * Genera PDF con lista de códigos
 */
export async function generarPDFCodigos() {
    const { data: estudiantes, error } = await supabase
        .from('estudiantes')
        .select('codigo, nombre_completo, nivel, grado, paralelo')
        .order('nombre_completo');
    
    if (error) {
        throw new Error(`Error al obtener estudiantes: ${error.message}`);
    }
    
    // Usar jsPDF (se carga desde CDN)
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('CÓDIGOS DE ESTUDIANTES 2026', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('Sistema de Pagos Escolares', 105, 28, { align: 'center' });
    
    // Línea separadora
    doc.line(20, 32, 190, 32);
    
    // Contenido
    let y = 40;
    doc.setFontSize(9);
    
    for (const est of estudiantes) {
        const grado = est.grado || '';
        const paralelo = est.paralelo || '';
        const info = `${grado} ${paralelo}`.trim();
        
        const linea = `${est.codigo}  ${est.nombre_completo.padEnd(35)}  ${est.nivel.padEnd(12)}  ${info}`;
        
        doc.text(linea, 20, y);
        y += 6;
        
        // Nueva página si es necesario
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
    }
    
    // Instrucciones al final
    doc.addPage();
    doc.setFontSize(12);
    doc.text('INSTRUCCIONES PARA PADRES', 105, 30, { align: 'center' });
    doc.setFontSize(10);
    
    const instrucciones = [
        '1. Busque el nombre de su hijo(s) en la lista anterior',
        '2. Anote el código de 4 dígitos',
        '3. Ingrese a: www.pagos-colegio.com/registro',
        '4. Complete el formulario y use los códigos de sus hijos',
        '5. Una vez registrado, podrá ver su cuenta y realizar pagos',
        '',
        'Importante:',
        '- Cada código es único y solo puede usarse una vez',
        '- Guarde este documento para futuras referencias',
        '- Para consultas, contacte a la administración del colegio'
    ];
    
    y = 50;
    instrucciones.forEach(linea => {
        doc.text(linea, 20, y);
        y += 8;
    });
    
    // Descargar
    doc.save('codigos-estudiantes-2026.pdf');
}
