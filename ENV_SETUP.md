# Configuración de Variables de Entorno - GESTAGENT

## 🔐 Credenciales Necesarias

### 1. Supabase
- **URL**: `https://vyqnurwqcrpfoyhwndmz.supabase.co` ✅
- **Anon Key**: Obtener de https://supabase.com/dashboard/project/vyqnurwqcrpfoyhwndmz/settings/api
- **Service Role Key**: Obtener del mismo dashboard (usar con cuidado, tiene permisos totales)

### 2. Mistral OCR
- **API Key**: `JITyrx8a7QaG8Wxj0XOqDRtgqmKUeOzr` ✅
- **Endpoint**: `https://api.mistral.ai/v1/ocr` ✅

### 3. OpenRouter (Llama 3.2 90B Vision)
- **API Key**: `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` ✅
- **Model**: `meta-llama/llama-3.2-90b-vision-instruct` ✅
- **API URL**: `https://openrouter.ai/api/v1` ✅

## 📝 Pasos para Configurar

1. **Copia el archivo de ejemplo**:
   ```bash
   cp .env.example .env.local
   ```

2. **Obtén las credenciales de Supabase**:
   - Ve a: https://supabase.com/dashboard/project/vyqnurwqcrpfoyhwndmz/settings/api
   - Copia "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copia "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Actualiza .env.local** con las credenciales

4. **Verifica la configuración**:
   ```bash
   node check-env.js
   ```

## ⚠️ Seguridad

- **NUNCA** commitees `.env.local` con credenciales reales
- El archivo debe estar en `.gitignore` (ya está configurado)
- Usa `.env.example` como referencia para otros desarrolladores

## 🔄 Cambios Importantes

- **OpenAI → OpenRouter**: Ya no usamos GPT-4o, ahora usamos Llama 3.2 90B Vision vía OpenRouter
- **Sistema Híbrido**: El sistema decidirá automáticamente si usar solo Llama o Mistral+Llama

## 🚀 Variables para Railway

En producción (Railway), configura estas variables en el dashboard:
- Todas las variables de `.env.local`
- Cambia `NEXTAUTH_URL` a tu dominio de producción
- Añade `NODE_ENV=production`
