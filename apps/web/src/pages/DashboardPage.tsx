import { useAuth } 
from '../auth/AuthContext'; 
export function DashboardPage() { 
    const auth = useAuth(); 
    
    return ( 
    <main className="dashboard-page"> 
        <header className="app-header"> 
            <div> <p className="eyebrow"> EMR Platform </p> 
                <h1> Development dashboard </h1> 
            </div> <div className="user-menu"> 
                <div> 
                    <strong> {auth.user?.firstName}{' '} {auth.user?.lastName} </strong> 
                    <span> {auth.user?.email} </span> 
                </div> 
                <button type="button" onClick={() => { void auth.logout(); }} > Sign out </button> 
            </div> 
        </header> 
        <section className="dashboard-content"> 
            <article className="status-card"> 
                <h2> Authentication active </h2> 
                <p> Your session has been authenticated and checked against the backend database. </p> 
                <dl className="status-grid"> 
                    <div> 
                        <dt>Roles</dt> 
                        <dd> {auth.user?.roles.join( ', ', ) || 'None'} </dd> 
                    </div> 
                    <div> 
                        <dt>Organization</dt> 
                        <dd> {auth.user ?.organizationId ?? 'System-wide'} </dd> 
                    </div> 
                    <div> 
                        <dt>Permissions</dt> 
                        <dd> {auth.user ?.permissions.length ?? 0} </dd> 
                    </div> 
                    <div> 
                        <dt>Session</dt> 
                        <dd>Active</dd> 
                    </div> 
                </dl> 
            </article> 
        </section> 
    </main> ); }