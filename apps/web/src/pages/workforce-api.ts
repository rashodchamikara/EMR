import { apiJson } from '../api/api-client';
export interface Page<T> { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }
export async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await apiJson<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=100`);
    items.push(...result.data);
    if (page >= result.meta.totalPages) return items;
  }
}
export interface StaffMember {
  id: string; userId: string; status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED'; jobTitle: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; status: string };
  roles: { role: { code: string; name: string } }[];
  practitioner: { id: string; type: string; status: string } | null;
  facilityAssignments: { id: string; status: string; isPrimary: boolean; facility: { id: string; name: string } }[];
}
export interface StaffRole { code: string; name: string }
