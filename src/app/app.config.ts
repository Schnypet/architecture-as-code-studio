import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { Configuration } from '../generated/api';
import { getApiConfig } from './config/api.config';

import { routes } from './app.routes';

// Custom color palette for Noir primary and Slate surface
const customAuraTheme = {
  ...Aura,
  primitive: {
    ...(Aura.primitive || {}),
    // Noir primary colors (very dark gray, almost black)
    noir: {
      50: '#f8f8f8',
      100: '#f0f0f0',
      200: '#dcdcdc',
      300: '#bdbdbd',
      400: '#989898',
      500: '#7c7c7c',
      600: '#656565',
      700: '#525252',
      800: '#404040',
      900: '#2d2d2d',
      950: '#1a1a1a'
    },
    // Slate surface colors (gray-blue palette)
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    }
  },
  semantic: {
    ...(Aura.semantic || {}),
    primary: {
      50: '#f8f8f8',
      100: '#f0f0f0',
      200: '#dcdcdc',
      300: '#bdbdbd',
      400: '#989898',
      500: '#7c7c7c',
      600: '#656565',
      700: '#525252',
      800: '#404040',
      900: '#2d2d2d',
      950: '#1a1a1a'
    },
    colorScheme: {
      ...(Aura.semantic?.colorScheme || {}),
      light: {
        ...(Aura.semantic?.colorScheme?.light || {}),
        primary: {
          color: '#1a1a1a',
          contrastColor: '#ffffff',
          hoverColor: '#2d2d2d',
          activeColor: '#404040'
        },
        surface: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        }
      },
      dark: {
        ...(Aura.semantic?.colorScheme?.dark || {}),
        primary: {
          color: '#f8f8f8',
          contrastColor: '#1a1a1a',
          hoverColor: '#f0f0f0',
          activeColor: '#dcdcdc'
        },
        surface: {
          0: '#020617',
          50: '#0f172a',
          100: '#1e293b',
          200: '#334155',
          300: '#475569',
          400: '#64748b',
          500: '#94a3b8',
          600: '#cbd5e1',
          700: '#e2e8f0',
          800: '#f1f5f9',
          900: '#f8fafc',
          950: '#ffffff'
        }
      }
    }
  }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: customAuraTheme,
        options: {
          prefix: 'p',
          darkModeSelector: 'system',
          cssLayer: false
        }
      }
    }),
    {
      provide: Configuration,
      useValue: new Configuration({
        basePath: getApiConfig().baseUrl
      })
    }
  ]
};
