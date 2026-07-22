import type { 
    AuthResponse, 
} from '../auth/auth.types'; 

const apiBaseUrl = 
    import.meta.env.VITE_API_BASE_URL; 
    let accessToken: string | null = null; 
    let refreshPromise: Promise<AuthResponse> | null = null; 
    export function setAccessToken( token: string | null, ): void { accessToken = token; } 
    export function getAccessToken(): string | null { return accessToken; } 
    async function refreshAccessToken(): Promise<AuthResponse> { 
        if (refreshPromise) { return refreshPromise; } 
        refreshPromise = fetch( `${apiBaseUrl}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { Accept: 'application/json', }, }, ) 
        .then(async (response) => { 
            if (!response.ok) { throw new Error( 'Unable to refresh session.', ); } 
            return response.json() as Promise<AuthResponse>; 
        }) 
        .then((result) => { 
            setAccessToken( result.accessToken, ); 
            return result; 
        }) 
        .finally(() => { refreshPromise = null; }); 
        return refreshPromise; 
    } 
    export async function apiFetch( path: string, options: RequestInit = {}, retryAfterRefresh = true, ): Promise<Response> { 
        const headers = new Headers(options.headers); 
        headers.set( 'Accept', 'application/json', ); 
        if ( options.body && !headers.has('Content-Type') ) { headers.set( 'Content-Type', 'application/json', ); } 
        if (accessToken) { headers.set( 'Authorization', `Bearer ${accessToken}`, ); } 
        const response = await fetch( `${apiBaseUrl}${path}`, { ...options, headers, credentials: 'include', }, ); 
        if ( response.status === 401 && retryAfterRefresh ) { 
            try { await refreshAccessToken(); return apiFetch( path, options, false, ); } catch { setAccessToken(null); } 
        } 
        return response; 
    } 
    export async function loginRequest( email: string, password: string, ): Promise<AuthResponse> { 
        const response = await fetch( `${apiBaseUrl}/auth/login`, { method: 'POST', credentials: 'include', headers: { Accept: 'application/json', 'Content-Type': 'application/json', }, body: JSON.stringify({ email, password, }), }, ); 
        if (!response.ok) { 
            const result = (await response.json()) as { message?: string | string[]; }; 
            const message = Array.isArray(result.message) ? result.message.join(', ') : result.message ?? 'Login failed.'; 
            throw new Error(message); 
        } 
        const result = (await response.json()) as AuthResponse; 
        setAccessToken(result.accessToken); 
        return result; 
    } 
    export async function logoutRequest(): Promise<void> { 
        await fetch( `${apiBaseUrl}/auth/logout`, { method: 'POST', credentials: 'include', }, ); 
        setAccessToken(null); 
    } 
    export async function restoreSession(): Promise<AuthResponse | null> { 
        try { return await refreshAccessToken(); } catch { setAccessToken(null); return null; } 
    }