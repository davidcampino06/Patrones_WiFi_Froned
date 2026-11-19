import { Link } from 'react-router-dom';
import { DataState } from '../../components/DataState';
import { Icon } from '../../components/Icon';
import { SensorCell } from '../../components/SensorPanel';
import { StatusBadge } from '../../components/StatusBadge';
import { StatusStrip } from '../../components/StatusStrip';
import { Tile } from '../../components/Tile';
import { TopBar } from '../../components/TopBar';
import { formatDateTime, roleLabel, statusLabel } from '../../format';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import type { AiTrainingStatus, User } from '../../types';
import { OUTCOME_TONE, outcomeLabel } from '../AuditPage';
import { Fleet, monitoringStatus, RealUsersCard, stripItems } from './parts';

/** Team accounts allowed (wifisense.accounts.max-users in the backend). */
const MAX_TEAM = 3;
/** Recent audit events shown here; the rest are in Auditoría. */
const RECENT = 5;

/**
 * The administrator's panel (Avance 33): the state of what it manages. The site's networks with their sensor, the team
 * accounts, the AI model and the latest sensitive operations, besides the services. Watching and analysing is the
 * analyst's panel; the administrator still reaches those pages from «Monitoreo y análisis» in the menu.
 */
export function AdminDashboard() {
  const summary = useApi(api.dashboard);
  const status = useApi(api.systemStatus);
  const networks = useApi(api.networks);
  const users = useApi(api.users);
  const training = useApi(api.aiTraining);
  const audit = useApi(() => api.audit({ page: 0, size: RECENT }));

  function refresh() {
    [summary, status, networks, users, training, audit].forEach((state) => state.reload());
  }

  return (
    <>
      <TopBar title="Administración" eyebrow="Administrador · Gestión de la sede"
              status={monitoringStatus(status.data)}
              actions={<button className="button button--quiet" onClick={refresh}>Actualizar</button>} />

      <div className="dash">
        <section className="dash__card" aria-labelledby="site-title">
          <div className="dash__head">
            <h2 className="dash__title" id="site-title"><Icon name="wifi" size={18} /> Redes de la sede</h2>
            <Link to="/networks">Gestionar redes</Link>
          </div>
          <DataState {...summary}>{(data) => <Fleet data={data} />}</DataState>
          <DataState {...networks} empty="Todavía no hay redes. Créalas en Redes y conecta su sensor.">
            {(rows) => (
              <ul className="list list--compact admin-nets">
                {rows.map((n) => (
                  <li key={n.id}>
                    <span className="list__main"><strong>{n.ssid}</strong><span className="muted small">{n.zoneName}</span></span>
                    <span className="admin-nets__state">
                      <StatusBadge value={n.status} />
                      <SensorCell network={n} label={statusLabel[n.dataSourceType] ?? n.dataSourceType} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </section>

        <section className="dash__card" aria-labelledby="team-title">
          <div className="dash__head">
            <h2 className="dash__title" id="team-title"><Icon name="users" size={18} /> Cuentas del equipo</h2>
            <Link to="/users">Gestionar</Link>
          </div>
          <DataState {...users}>{(rows) => <TeamAccounts users={rows} />}</DataState>
        </section>

        <section className="dash__card" aria-labelledby="model-title">
          <div className="dash__head">
            <h2 className="dash__title" id="model-title"><Icon name="ai" size={18} /> Modelo de IA</h2>
            <Link to="/ai-model">Ver</Link>
          </div>
          <DataState {...training}>{(data) => <ModelState data={data} />}</DataState>
        </section>

        <section className="dash__card dash__card--full" aria-labelledby="audit-title">
          <div className="dash__head">
            <h2 className="dash__title" id="audit-title"><Icon name="key" size={18} /> Operaciones sensibles recientes</h2>
            <Link to="/audit">Ver la auditoría</Link>
          </div>
          <DataState {...audit}>
            {(page) => (
              <ul className="list list--compact">
                {page.items.map((e) => (
                  <li key={e.id}>
                    <span className={`badge badge--${OUTCOME_TONE[e.outcome]}`}>{outcomeLabel[e.outcome]}</span>
                    <span className="list__main">
                      {e.actionLabel} <span className="muted">· {e.actorUsername ?? (e.actorRole === 'SYSTEM' ? 'Sistema' : 'Cuenta borrada')}</span>
                    </span>
                    <time>{formatDateTime(e.occurredAt)}</time>
                  </li>
                ))}
                {page.items.length === 0 && <li className="muted">Todavía no hay operaciones registradas.</li>}
              </ul>
            )}
          </DataState>
        </section>

        <RealUsersCard />
      </div>

      {status.data && <StatusStrip label="Estado de los servicios" items={stripItems(status.data)} />}
    </>
  );
}

function TeamAccounts({ users }: { users: User[] }) {
  const admins = users.filter((u) => u.role === 'ADMIN').length;
  const analysts = users.filter((u) => u.role === 'ANALYST').length;
  const free = Math.max(0, MAX_TEAM - users.length);
  return (
    <>
      <div className="tiles">
        <Tile icon="key" label="Administradores" value={String(admins)} />
        <Tile icon="analysis" label="Analistas" value={String(analysts)} />
      </div>
      <ul className="list list--compact admin-accounts">
        {users.map((u) => (
          <li key={u.id}>
            <span className="list__main">{u.username}</span>
            <span className="tag">{roleLabel[u.role] ?? u.role}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">{free === 1 ? 'Queda 1 cupo' : `Quedan ${free} cupos`} de {MAX_TEAM} cuentas del equipo.</p>
    </>
  );
}

function ModelState({ data }: { data: AiTrainingStatus }) {
  const active = data.versions.find((v) => v.active);
  return (
    <dl className="facts">
      <div><dt>En uso</dt><dd>{active ? active.version : 'Línea base (datos sintéticos)'}</dd></div>
      {active && <div><dt>Entrenado</dt><dd>{formatDateTime(active.trainedAt)}</dd></div>}
      <div>
        <dt>Mediciones reales</dt>
        <dd>{data.available.samples} <span className="muted">· {data.canTrain ? 'alcanzan para entrenar' : `se necesitan ${data.minimumSamples}`}</span></dd>
      </div>
      <div><dt>Próximo entrenamiento</dt><dd>{data.nextAutomatic ? formatDateTime(data.nextAutomatic) : 'Sin programar'}</dd></div>
    </dl>
  );
}
