import { Injectable } from '@angular/core';
import { BaseRenderer, DiagramOutput, RenderOptions } from '../renderers/base-renderer.interface';
import { ArchitectureModel } from '../models/architecture.model';
import { Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RendererRegistryService {
  private renderers = new Map<string, BaseRenderer<any>>();
  private readonly defaultRenderer = 'structurizr';

  constructor() {
    console.log('RendererRegistry initialized');
  }

  // Register a new renderer
  registerRenderer(renderer: BaseRenderer<any>): void {
    if (this.renderers.has(renderer.name)) {
      console.warn(`Renderer '${renderer.name}' is already registered. Overwriting.`);
    }
    
    this.renderers.set(renderer.name, renderer);
    console.log(`Registered renderer: ${renderer.name} v${renderer.version}`, {
      supportedFormats: renderer.supportedFormats,
      capabilities: renderer.getCapabilities()
    });
  }

  // Unregister a renderer
  unregisterRenderer(name: string): boolean {
    const removed = this.renderers.delete(name);
    if (removed) {
      console.log(`Unregistered renderer: ${name}`);
    }
    return removed;
  }

  // Get a specific renderer by name
  getRenderer(name: string): BaseRenderer<any> | null {
    return this.renderers.get(name) || null;
  }

  // Get all registered renderers
  getAllRenderers(): BaseRenderer<any>[] {
    return Array.from(this.renderers.values());
  }

  // Get renderer names
  getRendererNames(): string[] {
    return Array.from(this.renderers.keys());
  }

  // Get all supported formats across all renderers
  getSupportedFormats(): string[] {
    const formats = new Set<string>();
    this.renderers.forEach(renderer => {
      renderer.supportedFormats.forEach(format => formats.add(format));
    });
    return Array.from(formats).sort();
  }

  // Get renderers that support a specific format
  getRenderersForFormat(format: string): BaseRenderer<any>[] {
    return this.getAllRenderers().filter(renderer => 
      renderer.supportsFormat(format)
    );
  }

  // Check if a renderer exists
  hasRenderer(name: string): boolean {
    return this.renderers.has(name);
  }

  // Render using a specific renderer
  render(
    rendererName: string, 
    architecture: ArchitectureModel, 
    options?: RenderOptions
  ): Observable<DiagramOutput> {
    const renderer = this.getRenderer(rendererName);
    
    if (!renderer) {
      return throwError(() => new Error(`Renderer '${rendererName}' not found`));
    }

    // Validate architecture before rendering
    const validation = renderer.validate(architecture);
    if (!validation.isValid) {
      const errors = validation.errors.map(e => e.message).join(', ');
      return throwError(() => new Error(`Architecture validation failed: ${errors}`));
    }

    try {
      const result = renderer.render(architecture, options);
      
      // Handle both synchronous and asynchronous results
      if (result instanceof Observable) {
        return result;
      } else {
        return of(result as DiagramOutput);
      }
    } catch (error) {
      return throwError(() => new Error(`Rendering failed: ${error}`));
    }
  }

  // Render with the default renderer
  renderDefault(
    architecture: ArchitectureModel, 
    options?: RenderOptions
  ): Observable<DiagramOutput> {
    return this.render(this.defaultRenderer, architecture, options);
  }

  // Get renderer capabilities summary
  getCapabilitiesSummary(): RendererCapabilitiesSummary {
    const renderers = this.getAllRenderers();
    
    return {
      totalRenderers: renderers.length,
      supportedFormats: this.getSupportedFormats(),
      capabilities: {
        multipleViews: renderers.some(r => r.getCapabilities().multipleViews),
        customThemes: renderers.some(r => r.getCapabilities().customThemes),
        interactivity: renderers.some(r => r.getCapabilities().interactivity),
        filtering: renderers.some(r => r.getCapabilities().filteringSupport)
      },
      rendererDetails: renderers.map(renderer => ({
        name: renderer.name,
        version: renderer.version,
        formats: [...renderer.supportedFormats],
        capabilities: renderer.getCapabilities()
      }))
    };
  }

  // Validate all registered renderers
  validateRenderers(): RendererValidationResult[] {
    return this.getAllRenderers().map(renderer => {
      try {
        const capabilities = renderer.getCapabilities();
        const metadata = renderer.getMetadata();
        
        return {
          name: renderer.name,
          isValid: true,
          version: renderer.version,
          supportedFormats: [...renderer.supportedFormats],
          capabilities,
          metadata,
          errors: []
        };
      } catch (error) {
        return {
          name: renderer.name,
          isValid: false,
          version: renderer.version,
          supportedFormats: [...renderer.supportedFormats],
          errors: [`Validation failed: ${error}`]
        };
      }
    });
  }

  // Get registry statistics
  getStatistics(): RendererRegistryStatistics {
    const renderers = this.getAllRenderers();
    const formats = this.getSupportedFormats();
    
    return {
      rendererCount: renderers.length,
      formatCount: formats.length,
      totalCapabilities: renderers.reduce((sum, r) => {
        const caps = r.getCapabilities();
        return sum + Object.values(caps).filter(v => typeof v === 'boolean' && v).length;
      }, 0),
      memoryUsage: this.calculateMemoryUsage(),
      registrationTime: new Date()
    };
  }

  private calculateMemoryUsage(): number {
    // Rough estimate of memory usage
    return this.renderers.size * 1024; // 1KB per renderer estimate
  }
}

// Supporting interfaces
export interface RendererCapabilitiesSummary {
  totalRenderers: number;
  supportedFormats: string[];
  capabilities: {
    multipleViews: boolean;
    customThemes: boolean;
    interactivity: boolean;
    filtering: boolean;
  };
  rendererDetails: Array<{
    name: string;
    version: string;
    formats: string[];
    capabilities: any;
  }>;
}

export interface RendererValidationResult {
  name: string;
  isValid: boolean;
  version: string;
  supportedFormats: string[];
  capabilities?: any;
  metadata?: any;
  errors: string[];
}

export interface RendererRegistryStatistics {
  rendererCount: number;
  formatCount: number;
  totalCapabilities: number;
  memoryUsage: number;
  registrationTime: Date;
}