import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateTaskInput, Task, UpdateTaskInput } from '@app/data/browser';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TasksApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/tasks`;

    list(): Observable<Task[]> {
        return this.http.get<Task[]>(this.baseUrl);
    }

    create(dto: CreateTaskInput): Observable<Task> {
        return this.http.post<Task>(this.baseUrl, dto);
    }

    update(id: string, dto: UpdateTaskInput): Observable<Task> {
        return this.http.put<Task>(`${this.baseUrl}/${id}`, dto);
    }

    remove(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
