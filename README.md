# WiFiSense-frontend

Interfaz web de WiFiSense en React + TypeScript. Muestra el estado de las redes, mediciones, historial, análisis,
anomalías, alertas, reportes y una simulación visual de la arquitectura.

**Solo se comunica con el backend.** No contiene SQL, credenciales, claves de IA ni direcciones internas; una
prueba automática (`tests/architecture.test.ts`) falla si aparece una referencia directa a la IA o a la base de datos.

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
src/architecture/           modelo de la arquitectura y simulación visual
tests/                      pruebas de apiClient, reglas de arquitectura y componentes
```

## Secciones

Panel · Redes · Dispositivos · Mediciones · Historial · Análisis · Anomalías · Alertas · Reportes · Arquitectura.
Las acciones se muestran según el rol (Observador consulta; Analista recolecta, analiza y gestiona alertas;
Administrador además registra redes).

## Simulación de arquitectura

La sección Arquitectura dibuja Usuario → Frontend → Backend → Base de datos / IA. Permite seleccionar cada
componente (tecnología, responsabilidad, repositorio, conexiones permitidas y prohibidas) y ejecutar
“Simular solicitud” para ver el recorrido paso a paso de dos escenarios reales de la API. Las conexiones prohibidas
(Frontend → Base de datos, Frontend → IA, IA → Base de datos) aparecen tachadas. La animación es visual y se indica
en pantalla; el botón “Probar conexión real” sí hace una llamada al backend.

## Instalación y ejecución

```bash
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8080
npm run dev                 # http://localhost:5173
npm test                    # 12 pruebas
npm run build               # tipos + build de producción en dist/
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL pública del backend. Es la única dirección que conoce el frontend. |

## Dependencia del backend

Requiere WiFiSense-backend en ejecución y su variable `CORS_ALLOWED_ORIGINS` con el origen de este frontend.
Despliegue en Vercel: ver `DEPLOYMENT.md` en WiFiSense-backend (`vercel.json` ya resuelve las rutas del SPA).
