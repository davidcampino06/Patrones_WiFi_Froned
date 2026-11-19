import { useAuth } from '../auth/AuthContext';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { AnalystDashboard } from './dashboards/AnalystDashboard';

/**
 * The team's home: each role has its own panel (Avance 33). The administrator sees what it manages (networks and
 * sensors, accounts, the AI model, the audit); the analyst sees what it watches and acts on (health of a network,
 * alerts to attend, anomalies). The backend enforces the same split.
 */
export function DashboardPage() {
  const { can } = useAuth();
  return can('ADMIN') ? <AdminDashboard /> : <AnalystDashboard />;
}
