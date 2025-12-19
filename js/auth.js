import { initSupabase, getSupabase } from './supabase-config.js';

await initSupabase();
const supabase = getSupabase();

if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const input = document.getElementById('telefono').value.trim();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('errorLogin');
        
        errorDiv.textContent = '';
        
        try {
            // Determinar si es email o teléfono
            let emailToUse;
            
            if (input.includes('@')) {
                // Es un email (admin o padre con email)
                emailToUse = input;
            } else if (/^\d{8}$/.test(input)) {
                // Es teléfono de 8 dígitos (padre)
                // Convertir a email temporal con dominio válido
                emailToUse = `${input}@mailinator.com`;
            } else {
                errorDiv.textContent = 'Ingrese un email válido o teléfono de 8 dígitos';
                return;
            }
            
            console.log('Intentando login con:', emailToUse);
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password: password
            });
            
            if (error) throw error;
            
            console.log('✅ Login exitoso:', data.user.email);
            
            // Redirigir según el tipo de usuario
            if (data.user.email === 'colegio1@gmail.com') {
                window.location.href = 'dashboard-admin.html';
            } else {
                // Es un padre (puede tener email real o ficticio)
                window.location.href = 'dashboard-padre.html';
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            errorDiv.textContent = 'Usuario o contraseña incorrectos';
        }
    });
}

export { supabase };
