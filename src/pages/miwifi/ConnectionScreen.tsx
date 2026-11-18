import { BehaviorCard } from '../../components/AgentPanel';
import { ConnectionPanel } from '../../components/ConnectionPanel';
import { api } from '../../services/api';
import { NeedsNetwork, ScreenHeader } from './common';
import { useMiWifi } from './context';

/**
 * How the connection is doing: «Probar mi conexión» measures it and then keeps measuring every second (Avance 32: it
 * took the place of the separate «En vivo» panel here), and what the AI says.
 */
export function ConnectionScreen() {
  const { selected, agent, setLastTest } = useMiWifi();
  if (!selected) return <NeedsNetwork />;
  const latest = agent?.data?.latest ?? null;
  return (
    <>
      <ScreenHeader title="Conexión">
        «Probar mi conexión» mide cuánto aguanta tu internet y luego sigue midiendo cada segundo.
      </ScreenHeader>
      <ConnectionPanel key={selected.id} network={selected} onTested={setLastTest}
                       usage={(after) => api.myLive(selected.id, after)} />
      {latest && <div className="dash miwifi__single"><BehaviorCard latest={latest} /></div>}
    </>
  );
}
