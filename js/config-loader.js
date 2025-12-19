// ========== CARGADOR SEGURO DE CONFIGURACIÓN ==========
// Este archivo carga las credenciales de forma segura sin exponerlas directamente

// IMPORTANTE: En producción real, estas credenciales deberían venir de:
// 1. Variables de entorno del servidor
// 2. Firebase Hosting con variables de entorno
// 3. Backend que sirva las credenciales de forma segura

// Para desarrollo local, puedes crear un archivo 'firebase-credentials.js' (no incluido en git)
// con la siguiente estructura:

/*
export const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
*/

// Función para cargar configuración
export async function loadFirebaseConfig() {
    try {
        // Intenta cargar desde archivo de credenciales (desarrollo local)
        const credentials = await import('./firebase-credentials.js');
        return credentials.firebaseConfig;
    } catch (error) {
        // Si no existe, usa variables de entorno (producción)
        if (typeof process !== 'undefined' && process.env) {
            return {
                apiKey: process.env.FIREBASE_API_KEY,
                authDomain: process.env.FIREBASE_AUTH_DOMAIN,
                projectId: process.env.FIREBASE_PROJECT_ID,
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.FIREBASE_APP_ID
            };
        }
        
        // Si nada funciona, muestra error
        console.error('❌ No se encontró configuración de Firebase');
        console.error('📝 Por favor, crea el archivo "firebase-credentials.js" siguiendo las instrucciones');
        return null;
    }
}

// Validar que la configuración sea correcta
export function validateConfig(config) {
    if (!config) return false;
    
    const requiredFields = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId'
    ];
    
    for (const field of requiredFields) {
        if (!config[field] || config[field].includes('TU_') || config[field].includes('tu-proyecto')) {
            console.error(`❌ Campo "${field}" no está configurado correctamente`);
            return false;
        }
    }
    
    return true;
}
