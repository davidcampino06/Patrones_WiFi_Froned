export type NodeId = 'user' | 'frontend' | 'backend' | 'database' | 'ai';

export interface ArchitectureNode {
  id: NodeId;
  name: string;
  technology: string;
  repository: string | null;
  responsibility: string;
  x: number;
  y: number;
}

export interface Connection {
  from: NodeId;
  to: NodeId;
  protocol: string;
}

export interface Step {
  from: NodeId;
  to: NodeId;
  label: string;
}

export interface Scenario {
  id: string;
  name: string;
  endpoint: string;
  steps: Step[];
}

export const NODES: ArchitectureNode[] = [
  { id: 'user', name: 'Usuario', technology: 'Navegador web', repository: null,
    responsibility: 'Interactúa con la interfaz. Nunca ve direcciones internas.', x: 70, y: 190 },
  { id: 'frontend', name: 'Frontend', technology: 'React + TypeScript (Vercel)', repository: 'WiFiSense-frontend',
    responsibility: 'Muestra los datos y envía solicitudes solo al backend mediante apiClient.ts.', x: 290, y: 190 },
  { id: 'backend', name: 'Backend', technology: 'Java 21 + Spring Boot', repository: 'WiFiSense-backend',
    responsibility: 'Intermediario único: autentica, autoriza, aplica la lógica y coordina base de datos e IA.', x: 530, y: 190 },
  { id: 'database', name: 'Base de datos', technology: 'PostgreSQL + migraciones Flyway', repository: 'WiFiSense-database',
    responsibility: 'Guarda redes, mediciones, análisis, predicciones y alertas.', x: 800, y: 70 },
  { id: 'ai', name: 'Servicio de IA', technology: 'Python + FastAPI + scikit-learn', repository: 'WiFiSense-ai',
    responsibility: 'Detecta anomalías con Isolation Forest sobre los datos que le envía el backend.', x: 800, y: 310 },
];

export const ALLOWED: Connection[] = [
  { from: 'user', to: 'frontend', protocol: 'HTTPS' },
  { from: 'frontend', to: 'backend', protocol: 'HTTP/REST + JWT' },
  { from: 'backend', to: 'database', protocol: 'JDBC / PostgreSQL' },
  { from: 'backend', to: 'ai', protocol: 'HTTP/REST + API key' },
];

export const FORBIDDEN: Connection[] = [
  { from: 'frontend', to: 'database', protocol: 'Prohibido: expondría credenciales y SQL en el navegador' },
  { from: 'frontend', to: 'ai', protocol: 'Prohibido: la IA no es pública y no valida usuarios' },
  { from: 'ai', to: 'database', protocol: 'Prohibido: la IA solo recibe los datos que envía el backend' },
];

const roundTrip = (path: NodeId[], labels: string[]): Step[] =>
  path.slice(1).map((to, i) => ({ from: path[i], to, label: labels[i] }));

export const SCENARIOS: Scenario[] = [
  {
    id: 'list-networks',
    name: 'Consultar redes',
    endpoint: 'GET /api/networks',
    steps: roundTrip(['user', 'frontend', 'backend', 'database', 'backend', 'frontend', 'user'], [
      'Abre la sección Redes',
      'apiClient envía la solicitud con el token JWT',
      'Spring Security valida el token; NetworkService consulta el repositorio',
      'PostgreSQL devuelve las filas',
      'El backend responde con DTOs en JSON',
      'La tabla de redes se actualiza',
    ]),
  },
  {
    id: 'ai-analysis',
    name: 'Análisis con IA',
    endpoint: 'POST /api/networks/{id}/analyses',
    steps: roundTrip(['user', 'frontend', 'backend', 'database', 'backend', 'ai', 'backend', 'database', 'backend', 'frontend', 'user'], [
      'Elige "IA · Isolation Forest" y ejecuta',
      'Solicitud autenticada (rol Analista)',
      'NetworkAnalysisFacade lee la ventana de mediciones',
      'Mediciones y tráfico de la red',
      'AnomalyDetectionStrategy llama a AiAnalysisClient',
      'El modelo devuelve puntaje, severidad y recomendación',
      'Se guardan el resultado, la predicción y, si cambia el estado, una alerta',
      'Confirmación de la transacción',
      'Respuesta con el resultado del análisis',
      'Se muestra el resultado',
    ]),
  },
];

export const isAllowed = (from: NodeId, to: NodeId) =>
  ALLOWED.some((c) => (c.from === from && c.to === to) || (c.from === to && c.to === from));

export const nodeById = (id: NodeId) => NODES.find((n) => n.id === id)!;
