import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

function mockMatchMedia(prefersDark: boolean): void {
    window.matchMedia = jest.fn().mockReturnValue({
        matches: prefersDark,
    }) as unknown as typeof window.matchMedia;
}

describe('ThemeService', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        mockMatchMedia(false);
    });

    it('uses the stored theme when one was saved, ignoring system preference', () => {
        localStorage.setItem('tv-theme', 'dark');
        mockMatchMedia(false);

        const service = TestBed.inject(ThemeService);

        expect(service.theme()).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('falls back to the system preference when nothing is stored', () => {
        mockMatchMedia(true);

        const service = TestBed.inject(ThemeService);

        expect(service.theme()).toBe('dark');
    });

    it('defaults to light when nothing is stored and the system has no dark preference', () => {
        mockMatchMedia(false);

        const service = TestBed.inject(ThemeService);

        expect(service.theme()).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('ignores a corrupted stored value and falls back to system preference', () => {
        localStorage.setItem('tv-theme', 'not-a-theme');
        mockMatchMedia(true);

        const service = TestBed.inject(ThemeService);

        expect(service.theme()).toBe('dark');
    });

    it('toggle() flips the theme, persists it, and updates the dark class', () => {
        mockMatchMedia(false);
        const service = TestBed.inject(ThemeService);
        expect(service.theme()).toBe('light');

        service.toggle();

        expect(service.theme()).toBe('dark');
        expect(localStorage.getItem('tv-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        service.toggle();

        expect(service.theme()).toBe('light');
        expect(localStorage.getItem('tv-theme')).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
});
