import { 
    Navigate, 
    Outlet, 
    useLocation, } from 'react-router'; 
    import { useAuth } from '../auth/useAuth';
    
    export function ProtectedRoute() { 
        const auth = useAuth(); 
        const location = useLocation(); 
        if (auth.initializing) { 
            return ( 
                <main className="centered-page"> 
                    <section className="status-card"> 
                        <p> Restoring your secure session… </p> 
                    </section> 
                </main> 
            ); 
        } 
        if (!auth.authenticated) { 
            return ( 
                <Navigate to="/login" replace state={{ from: location.pathname, }} /> 
            ); 
        } 
        return <Outlet />; 
    }