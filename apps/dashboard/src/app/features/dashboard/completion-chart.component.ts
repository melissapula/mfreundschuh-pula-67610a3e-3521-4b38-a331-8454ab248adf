import { Component, Input } from '@angular/core';

export interface CompletionStats {
    total: number;
    done: number;
    percent: number;
}

@Component({
    selector: 'app-completion-chart',
    standalone: true,
    templateUrl: './completion-chart.component.html',
})
export class CompletionChartComponent {
    @Input({ required: true }) stats!: CompletionStats;
}
