# WiFiSense-frontend

Interfaz web de WiFiSense en React + TypeScript. Muestra el estado de las redes, mediciones, historial, análisis,
anomalías, alertas y reportes. El acceso es solo para un máximo de 3 cuentas creadas por el administrador.

**Solo se comunica con el backend.** No contiene SQL, credenciales, claves de IA ni direcciones internas; una
prueba automática (`tests/security.test.ts`) falla si aparece una referencia directa a la IA o a la base de datos.

## Tecnologías

React 19 · TypeScript · Vite · React Router · Recharts · Vitest + Testing Library. Node/npm se usan solo como
herramientas de desarrollo y build; no hay servidor Node en producción.

## Estructura

```text
src/services/apiClient.ts   único punto de salida HTTP: URL base, token JWT, errores
src/services/api.ts         funciones por endpoint del backend
src/auth/AuthContext.tsx    sesión y rol del usuario (el backend aplica la autorización real)
src/hooks/                  carga de datos y selección de red
src/components/             layout, insignias de estado, gráficos, estados de carga/error/vacío
src/pages/                  una página por sección
src/auth/credentials.ts     límites de usuario (20) y contraseña (10–12) y reglas de contraseña
tests/                      pruebas de apiClient, reglas de arquitectura y componentes
```

## Secciones

Panel · Redes · Dispositivos · Mediciones · Historial · Análisis · Anomalías · Alertas · Reportes · Usuarios (solo administrador).
Las acciones se muestran según el rol (Observador consulta; Analista recolecta, analiza y gestiona alertas;
Administrador además registra redes).

## Inicio de sesión y cuentas

- No hay registro público. El administrador crea hasta 3 cuentas en **Usuarios**, con una lista que muestra en
  vivo qué requisitos cumple la contraseña (10–12 caracteres, mayúscula, número y carácter especial).
- Usuario limitado a 20 caracteres y contraseña a 12: pegar textos enormes no tiene efecto.
- Botón con ícono de ojo para mostrar u ocultar la contraseña.
- Cualquier error de login muestra solo `Datos incorrectos.`
- `vercel.json` agrega cabeceras de seguridad (CSP, no embeber en iframes, sin referer).

## Instalación y ejecución

```bash
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8080
npm run dev                 # http://localhost:5173
npm test                    # 25 pruebas
npm run build               # tipos + build de producción en dist/
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL pública del backend. Es la única dirección que conoce el frontend. |

## Dependencia del backend

Requiere WiFiSense-backend en ejecución y su variable `CORS_ALLOWED_ORIGINS` con el origen de este frontend.
Despliegue en Vercel: ver `DEPLOYMENT.md` en WiFiSense-backend (`vercel.json` ya resuelve las rutas del SPA).
