import { Suspense, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../format';
import { ErrorBoundary } from './ErrorBoundary';
import { menuFor } from '../teamMenu';
import { isStaff } from '../types';
import { Icon } from './Icon';
import { NetworkBackdrop } from './NetworkBackdrop';
import { SiteFooter } from './SiteFooter';
import { ThemeToggle } from './ThemeToggle';
import { WifiLogo } from './WifiLogo';

/** The menu follows the role (Avance 33): each one sees its work first, grouped. */
export function Layout() {
  const { user, logout } = useAuth();
  const groups = user && isStaff(user.role) ? menuFor(user.role) : [];
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="shell">
      <NetworkBackdrop />
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <span className="brand">
            <WifiLogo size={30} />
            WiFiSense
          </span>
          <button className="sidebar__toggle" aria-expanded={open} aria-controls="main-nav"
                  onClick={() => setOpen((v) => !v)}>
            {open ? 'Cerrar' : 'Menú'}
          </button>
        </div>
        <nav id="main-nav" aria-label="Secciones">
          {groups.map((group) => (
            <div key={group.title} className="sidebar__group" role="group" aria-labelledby={`menu-${group.title}`}>
              <span className="stamp sidebar__label" id={`menu-${group.title}`}>{group.title}</span>
              {group.items.map((s) => (
                <NavLink key={s.to} to={s.to} end={s.to === '/'} onClick={() => setOpen(false)}>
                  <Icon name={s.icon} size={18} /> {s.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        {user && (
          <div className="sidebar__user">
            <span>{user.username}</span>
            <small>{roleLabel[user.role]}</small>
            <ThemeToggle />
            <button className="link-button" onClick={logout}>Cerrar sesión</button>
          </div>
        )}
      </aside>
      <main className="content">
        {/* Only the page changes while the next one loads, or if it fails; the menu stays in place. */}
        <div className="content__page">
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<p className="notice page-loading" role="status" aria-busy="true">Cargando…</p>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
