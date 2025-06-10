# 🖥️ Instalación con Desktop Commander

## Pasos para ejecutar con Desktop Commander:

1. **Abrir Terminal**:
   ```
   Ctrl+Alt+T (o el atajo de tu sistema)
   ```

2. **Navegar al proyecto**:
   ```bash
   cd /home/dreambular/Documentos/Proyectos/gestagent
   ```

3. **Ejecutar el script de instalación**:
   ```bash
   ./install-postgresql-auto.sh
   ```

4. **Cuando pida la contraseña sudo**:
   - Desktop Commander deberá escribir tu contraseña de usuario
   - La instalación continuará automáticamente

## Comandos para Desktop Commander:

Si estás usando desktop-commander desde Cursor, puedes pedirle que:

1. "Take a screenshot of the desktop"
2. "Open a terminal"
3. "Type: cd /home/dreambular/Documentos/Proyectos/gestagent"
4. "Press Enter"
5. "Type: ./install-postgresql-auto.sh"
6. "Press Enter"
7. "When password prompt appears, type: [tu contraseña]"
8. "Press Enter"

## Verificación post-instalación:

Una vez completada la instalación, verifica con:

```bash
psql --version
sudo systemctl status postgresql
```

## Iniciar el proyecto:

```bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 20
npm run dev
```

El sistema estará disponible en: http://localhost:3000