// ========== SELECTOR DE TEMAS ==========

// Cargar tema guardado al inicio
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('loginTheme') || 'purple';
    applyTheme(savedTheme);
    
    // Marcar el botón activo correcto
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === savedTheme) {
            btn.classList.add('active');
        }
    });
    
    // Funcionalidad para mostrar/ocultar contraseña
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }
});

// Event listeners para los botones de tema
document.querySelectorAll('.theme-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        
        const theme = button.dataset.theme;
        
        // Quitar clase active de todos los botones
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Agregar clase active al botón clickeado
        button.classList.add('active');
        
        // Aplicar el tema
        applyTheme(theme);
        
        // Guardar preferencia en localStorage
        localStorage.setItem('loginTheme', theme);
        
        // Efecto de animación
        button.style.animation = 'none';
        setTimeout(() => {
            button.style.animation = '';
        }, 10);
    });
});

function applyTheme(theme) {
    // Remover todas las clases de tema
    document.body.classList.remove('theme-purple', 'theme-red', 'theme-green', 'theme-pink');
    
    // Agregar la clase del tema seleccionado
    document.body.classList.add(`theme-${theme}`);
    
    // Actualizar colores del botón de login según el tema
    const btnLogin = document.querySelector('.btn-login');
    if (btnLogin) {
        switch(theme) {
            case 'purple':
                btnLogin.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                break;
            case 'red':
                btnLogin.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                break;
            case 'green':
                btnLogin.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
                break;
            case 'pink':
                btnLogin.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
                break;
        }
    }
}
