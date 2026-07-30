import { NavLink, Outlet, } from 'react-router'; 
import { useAuth } from '../auth/useAuth';
import { OrganizationSwitcher, } from './OrganizationSwitcher'; 
export function AppLayout() { const auth = useAuth(); const canViewFacilities = auth.user?.permissions.includes( 'facilities.read', ); 
    return ( 
    <div className="app-shell"> <aside className="sidebar"> 
        <div className="sidebar-brand"> <span className="brand-mark"> EMR </span> 
        <div> 
            <strong> Clinical Platform </strong> <small> Administration </small> 
        </div> 
    </div> 
    <nav className="sidebar-nav"> 
        <NavLink to="/"> Dashboard </NavLink> 
        {canViewFacilities && ( <NavLink to="/administration/facilities"> Facilities </NavLink> )} 
    </nav> </aside> 
    <div className="app-main"> 
        <header className="topbar"> <OrganizationSwitcher /> 
            <div className="topbar-user"> 
                <div> 
                    <strong> {auth.user?.firstName}{' '} {auth.user?.lastName} </strong> 
                    <span> {auth.user?.email} </span> 
                </div> 
                <button type="button" onClick={() => { void auth.logout(); }} > Sign out </button> 
            </div> 
        </header> 
        <div className="page-content"> <Outlet /> </div> 
    </div> 
</div> ); }