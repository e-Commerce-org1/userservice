import { Observable } from 'rxjs';

export interface AuthServiceGrpc {
  getToken(data: { email: string; deviceId: string; entityId: string }): Observable<{
    accessToken: string;
    refreshToken: string;
  }>;
  accessToken(data: { refreshToken: string }): Observable<{
    accessToken: string;
  }>;
  logout(data: { accessToken: string }): Observable<{ success: boolean }>;
  validateToken(data: { accessToken: string }): Observable<{
    isValid: boolean;
    message?: string;
    entityId: string;
    email?: string;
    deviceId?: string;
    role?: string;
  }>;
}
