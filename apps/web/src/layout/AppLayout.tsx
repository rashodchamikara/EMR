import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { OrganizationSwitcher } from './OrganizationSwitcher';

export function AppLayout() {
  const auth = useAuth();

  const permissions = auth.user?.permissions ?? [];

  const canViewFacilities = permissions.includes('facilities.read');
  const canViewDepartments = permissions.includes('departments.read');
  const canViewRooms = permissions.includes('rooms.read');
  const canViewStaff = permissions.includes('staff.read');
  const canViewPractitioners = permissions.includes('practitioners.read');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">EMR</span>

          <div>
            <strong>Clinical Platform</strong>
            <small>Administration</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/">Dashboard</NavLink>
          {permissions.includes('patients.read') && <NavLink to="/patients">Patients</NavLink>}

          {canViewFacilities && (
            <NavLink to="/administration/facilities">
              Facilities
            </NavLink>
          )}

          {canViewDepartments && (
            <NavLink to="/administration/departments">
              Departments
            </NavLink>
          )}

          {canViewRooms && (
            <NavLink to="/administration/rooms">
              Rooms
            </NavLink>
          )}

          {canViewStaff && (
            <NavLink to="/administration/staff">
              Staff
            </NavLink>
          )}

          {canViewPractitioners && (
            <NavLink to="/administration/practitioners">
              Practitioners
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <OrganizationSwitcher />

          <div className="topbar-user">
            <div>
              <strong>
                {auth.user?.firstName} {auth.user?.lastName}
              </strong>

              <span>{auth.user?.email}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                void auth.logout();
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}