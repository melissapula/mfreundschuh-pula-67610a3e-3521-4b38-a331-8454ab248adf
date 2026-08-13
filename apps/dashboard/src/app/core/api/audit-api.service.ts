import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuditLog } from '@app/data/browser';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditApiService {
    private readonly http = inject(HttpClient);

    list(): Observable<AuditLog[]> {
        return this.http.get<AuditLog[]>(`${environment.apiUrl}/audit-log`);
    }
}
