import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuditLog } from '@app/data/browser';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  constructor(private readonly http: HttpClient) {}

  list(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${environment.apiUrl}/audit-log`);
  }
}
