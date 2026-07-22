export interface AuthenticatedUser { 
    userId: string; 
    sessionId: string; 
    email: string; 
    firstName: string; 
    lastName: string; 
    organizationId: string | null; 
    roles: string[]; 
    permissions: string[]; 
} 

export interface AuthResponse { 
    accessToken: string; 
    expiresIn: number; 
    user: AuthenticatedUser; 
} 

export interface LoginInput { 
    email: string; 
    password: string; 
}