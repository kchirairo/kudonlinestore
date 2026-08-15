import { useAuth, AuthContextType } from '../context/AuthContext';

export { useAuth };
export type { AuthContextType };
export const useUserRole = useAuth;
