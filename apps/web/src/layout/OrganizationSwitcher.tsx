import { useEffect, useState, } from 'react'; 
import { apiJson, } from '../api/api-client'; 
import { useAuth } from '../auth/useAuth'; 
import type { AvailableOrganization, } from '../auth/auth.types'; 
export function OrganizationSwitcher() { 
    const auth = useAuth(); 
    const [ organizations, setOrganizations, ] = useState< AvailableOrganization[] >([]); 
    const [loading, setLoading] = useState(true); 
    const [switching, setSwitching] = useState(false); 
    useEffect(() => { 
        const loadOrganizations = async (): Promise<void> => { 
            try { 
                const result = await apiJson< AvailableOrganization[] >( '/auth/organizations', ); 
                setOrganizations(result); 
            } finally { 
                setLoading(false); 
            } 
        }; 
        void loadOrganizations(); 
    }, []); 
    const handleChange = async ( organizationId: string, ): Promise<void> => { 
        if (!organizationId) { return; } 
        setSwitching(true); 
        try { 
            await auth.switchOrganization( organizationId, ); 
        } finally { 
            setSwitching(false); 
        } 
    }; 
    return ( 
        <label className="organization-switcher"> 
            <span> Active organization </span> 
            <select value={ auth.user?.organizationId ?? '' } disabled={ loading || switching } onChange={(event) => { void handleChange( event.target.value, ); }} > 
                <option value=""> Select organization </option> 
                {organizations.map( (organization) => ( 
                    <option key={organization.id} value={organization.id} > {organization.name} </option> 
                ), )} 
            </select> 
        </label> 
    ); 
}