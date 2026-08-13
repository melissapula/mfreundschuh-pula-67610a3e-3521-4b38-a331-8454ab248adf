import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuditLog } from '@app/data/browser';
import { AuditApiService } from '../../core/api/audit-api.service';

@Component({
    selector: 'app-audit-log',
    standalone: true,
    imports: [RouterLink, DatePipe],
    templateUrl: './audit-log.component.html',
})
export class AuditLogComponent implements OnInit {
    private readonly api = inject(AuditApiService);

    readonly entries = signal<AuditLog[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    async ngOnInit(): Promise<void> {
        try {
            const entries = await firstValueFrom(this.api.list());
            this.entries.set(entries);
        } catch {
            this.error.set('Could not load the audit log.');
        } finally {
            this.loading.set(false);
        }
    }
}
