import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { Observable, from, throwError, of, BehaviorSubject } from 'rxjs';
import { switchMap, map, catchError, timeout, retry, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PlantUMLServerConfig {
  url: string;
  timeout: number;
  maxRetries: number;
  formats: PlantUMLFormat[];
}

export type PlantUMLFormat = 'svg' | 'png' | 'txt' | 'puml';

export interface PlantUMLRenderOptions {
  format: PlantUMLFormat;
  timeout?: number;
  useCache?: boolean;
}

export interface PlantUMLDiagram {
  code: string;
  encodedUrl: string;
  safeUrl: SafeResourceUrl;
  safeImageUrl?: SafeUrl;
  format: PlantUMLFormat;
  blob?: Blob;
  success: boolean;
  error?: string;
  timestamp: Date;
  displayMode?: 'iframe' | 'image';
}

export interface PlantUMLServerInfo {
  url: string;
  available: boolean;
  version?: string;
  supportedFormats: PlantUMLFormat[];
  lastChecked: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PlantUMLService {
  private readonly serverConfig: PlantUMLServerConfig;
  private readonly serverInfo$ = new BehaviorSubject<PlantUMLServerInfo>({
    url: environment.plantumlServerUrl,
    available: false,
    supportedFormats: ['svg', 'png', 'txt', 'puml'],
    lastChecked: new Date()
  });

  private readonly cache = new Map<string, PlantUMLDiagram>();

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    this.serverConfig = {
      url: environment.plantumlServerUrl,
      timeout: 10000,
      maxRetries: 2,
      formats: ['svg', 'png', 'txt', 'puml']
    };
    
    console.log(`PlantUML Service initialized with server: ${this.serverConfig.url}`);
    this.checkServerAvailability();
  }

  /**
   * Get current server configuration
   */
  getServerConfig(): PlantUMLServerConfig {
    return { ...this.serverConfig };
  }

  /**
   * Get server info as observable
   */
  getServerInfo(): Observable<PlantUMLServerInfo> {
    return this.serverInfo$.asObservable();
  }

  /**
   * Check if PlantUML server is available
   */
  checkServerAvailability(): Observable<boolean> {
    const testCode = '@startuml\\nAlice -> Bob: Hello\\n@enduml';
    
    return this.renderDiagramDirect(testCode, { format: 'txt', timeout: 5000 }).pipe(
      map(() => {
        this.updateServerInfo({ available: true });
        return true;
      }),
      catchError((error) => {
        console.warn('PlantUML server not available:', error.message);
        this.updateServerInfo({ available: false });
        return of(false);
      })
    );
  }

  /**
   * Render PlantUML diagram with full error handling and caching
   */
  renderDiagram(code: string, options: PlantUMLRenderOptions = { format: 'svg' }): Observable<PlantUMLDiagram> {
    if (!code?.trim()) {
      return throwError(() => new Error('PlantUML code is required'));
    }

    const cacheKey = this.getCacheKey(code, options);
    
    // Check cache if enabled
    if (options.useCache !== false && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      console.log('Returning cached PlantUML diagram:', cacheKey);
      return of(cached);
    }

    console.log(`Rendering PlantUML diagram (${options.format}):`, code.substring(0, 100) + '...');
    
    return this.renderDiagramDirect(code, options).pipe(
      map((diagram) => {
        // Cache successful renders
        if (options.useCache !== false && diagram.success) {
          this.cache.set(cacheKey, diagram);
        }
        return diagram;
      }),
      catchError((error) => {
        console.error('PlantUML rendering failed:', error);
        return of(this.createErrorDiagram(code, options, error.message));
      })
    );
  }

  /**
   * Direct diagram rendering without caching
   */
  private renderDiagramDirect(code: string, options: PlantUMLRenderOptions): Observable<PlantUMLDiagram> {
    return from(import('plantuml-encoder')).pipe(
      switchMap((encoder) => {
        const encoded = encoder.encode(code);
        const diagramUrl = `${this.serverConfig.url}/${options.format}/${encoded}`;
        
        const headers = new HttpHeaders({
          'Accept': this.getAcceptHeader(options.format),
          'Cache-Control': 'no-cache'
        });
        
        console.log(`PlantUML request URL: ${diagramUrl}`);
        
        return this.http.get(diagramUrl, {
          responseType: 'blob',
          headers: headers
        }).pipe(
          timeout(options.timeout || this.serverConfig.timeout),
          retry(this.serverConfig.maxRetries),
          map((blob) => this.createSuccessDiagram(code, options, diagramUrl, blob)),
          tap(() => this.updateServerInfo({ available: true })),
          catchError((error) => {
            this.updateServerInfo({ available: false });
            return this.handleRenderError(code, options, diagramUrl, error);
          })
        );
      })
    );
  }

  /**
   * Get safe URL for iframe embedding
   */
  getSafeIframeUrl(code: string, format: PlantUMLFormat = 'svg'): Observable<SafeResourceUrl> {
    return from(import('plantuml-encoder')).pipe(
      map((encoder) => {
        const encoded = encoder.encode(code);
        const url = `${this.serverConfig.url}/${format}/${encoded}`;
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
      })
    );
  }

  /**
   * Get safe URL for image display
   */
  getSafeImageUrl(code: string, format: PlantUMLFormat = 'png'): Observable<SafeUrl> {
    return from(import('plantuml-encoder')).pipe(
      map((encoder) => {
        const encoded = encoder.encode(code);
        const url = `${this.serverConfig.url}/${format}/${encoded}`;
        return this.sanitizer.bypassSecurityTrustUrl(url);
      })
    );
  }

  /**
   * Generate direct URL (without sanitization)
   */
  getDirectUrl(code: string, format: PlantUMLFormat = 'svg'): Observable<string> {
    return from(import('plantuml-encoder')).pipe(
      map((encoder) => {
        const encoded = encoder.encode(code);
        return `${this.serverConfig.url}/${format}/${encoded}`;
      })
    );
  }

  /**
   * Clear diagram cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('PlantUML cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  private createSuccessDiagram(
    code: string,
    options: PlantUMLRenderOptions,
    url: string,
    blob: Blob
  ): PlantUMLDiagram {
    return {
      code,
      encodedUrl: url,
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url),
      safeImageUrl: this.sanitizer.bypassSecurityTrustUrl(url),
      format: options.format,
      blob,
      success: true,
      timestamp: new Date()
    };
  }

  private createErrorDiagram(
    code: string,
    options: PlantUMLRenderOptions,
    error: string
  ): PlantUMLDiagram {
    const errorUrl = 'data:image/svg+xml;base64,' + btoa(this.createErrorSvg(error));
    
    return {
      code,
      encodedUrl: errorUrl,
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(errorUrl),
      safeImageUrl: this.sanitizer.bypassSecurityTrustUrl(errorUrl),
      format: options.format,
      success: false,
      error,
      timestamp: new Date()
    };
  }

  private createErrorSvg(message: string): string {
    return `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#fff2f2" stroke="#ff6b6b" stroke-width="2"/>
        <text x="200" y="100" text-anchor="middle" font-family="monospace" font-size="14" fill="#d63031">
          PlantUML Render Error
        </text>
        <text x="200" y="130" text-anchor="middle" font-family="monospace" font-size="12" fill="#636e72">
          ${message.substring(0, 50)}...
        </text>
      </svg>
    `;
  }

  private handleRenderError(
    code: string,
    options: PlantUMLRenderOptions,
    url: string,
    error: any
  ): Observable<PlantUMLDiagram> {
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        errorMessage = `Server ${this.serverConfig.url} not accessible`;
      } else {
        errorMessage = `Server error: ${error.status} ${error.statusText}`;
      }
    } else if (error.name === 'TimeoutError') {
      errorMessage = `Request timeout after ${this.serverConfig.timeout}ms`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }

  private updateServerInfo(updates: Partial<PlantUMLServerInfo>): void {
    const current = this.serverInfo$.value;
    this.serverInfo$.next({
      ...current,
      ...updates,
      lastChecked: new Date()
    });
  }

  private getCacheKey(code: string, options: PlantUMLRenderOptions): string {
    const hash = btoa(code).substring(0, 16);
    return `${hash}_${options.format}`;
  }

  private getAcceptHeader(format: PlantUMLFormat): string {
    switch (format) {
      case 'svg':
        return 'image/svg+xml';
      case 'png':
        return 'image/png';
      case 'txt':
      case 'puml':
        return 'text/plain';
      default:
        return 'image/svg+xml';
    }
  }
}