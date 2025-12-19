/**
 * CONFIGURACIÓN DE SUPABASE
 * ====================================
 */

const SUPABASE_URL = window.ENV?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = window.ENV?.VITE_SUPABASE_ANON_KEY;

let supabaseClient = null;

/**
 * Inicializa el cliente de Supabase
 */
async function initSupabase() {
    try {
        // Validar credenciales
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error('⚠️ Credenciales de Supabase no configuradas');
        }

        // Crear cliente de Supabase
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        console.log('✅ Supabase inicializado correctamente');
        return supabaseClient;
        
    } catch (error) {
        console.error('❌ Error al inicializar Supabase:', error);
        throw error;
    }
}

/**
 * Obtiene el cliente de Supabase (singleton)
 */
function getSupabase() {
    if (!supabaseClient) {
        throw new Error('Supabase no ha sido inicializado. Llama a initSupabase() primero.');
    }
    return supabaseClient;
}

/**
 * Verifica el estado de la conexión
 */
async function verificarConexion() {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.from('tarifas').select('count').limit(1);
        
        if (error) throw error;
        
        console.log('✅ Conexión a base de datos exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        return false;
    }
}

// Exportar funciones
export { initSupabase, getSupabase, verificarConexion };
