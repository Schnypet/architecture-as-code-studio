import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { RendererRegistryService } from './renderer-registry.service';
import { StructurizrRenderer } from '../renderers/structurizr.renderer';
import { LikeC4Renderer } from '../renderers/likec4.renderer';
import { GraphRenderer } from '../renderers/graph.renderer';
import { PlantUMLRenderer } from '../renderers/plantuml.renderer';
import { ArchitectureModel, ValidationResult, ArchitectureModelAnalyzer } from '../models/architecture.model';
import { DiagramOutput, RenderOptions, ViewType } from '../renderers/base-renderer.interface';
import type { Architecture } from '../../generated/api';

@Injectable({
  providedIn: 'root'
})
export class DiagramService {
  
  constructor(
    private rendererRegistry: RendererRegistryService,
    private structurizrRenderer: StructurizrRenderer,
    private likeC4Renderer: LikeC4Renderer,
    private graphRenderer: GraphRenderer,
    private plantUMLRenderer: PlantUMLRenderer
  ) {
    this.initializeRenderers();
  }

  private initializeRenderers(): void {
    // Register all available renderers
    this.rendererRegistry.registerRenderer(this.structurizrRenderer);
    this.rendererRegistry.registerRenderer(this.likeC4Renderer);
    this.rendererRegistry.registerRenderer(this.graphRenderer);
    this.rendererRegistry.registerRenderer(this.plantUMLRenderer);
    
    console.log('DiagramService initialized with renderers:', 
      this.rendererRegistry.getRendererNames());
  }

  // Type guard to check if object is ArchitectureModel
  private isArchitectureModel(obj: any): obj is ArchitectureModel {
    return obj && typeof obj === 'object' && 
           typeof obj.uid === 'string' && 
           typeof obj.name === 'string';
  }

  // Convert OpenAPI Architecture to ArchitectureModel
  convertToArchitectureModel(architecture: Architecture): ArchitectureModel {
    return {
      uid: architecture.uid || 'default-architecture-' + Date.now(),
      name: architecture.name || 'Unnamed Architecture',
      description: architecture.description || '',
      version: architecture.version,
      businessLayer: architecture.businessLayer,
      applicationLayer: architecture.applicationLayer,
      technologyLayer: architecture.technologyLayer,
      relationships: architecture.relationships,
      metadata: architecture.metadata
    };
  }

  // Render diagram with specified renderer and format
  renderDiagram(
    architecture: Architecture | ArchitectureModel,
    rendererName: string,
    format?: string,
    options?: Partial<RenderOptions>
  ): Observable<DiagramOutput> {
    try {
      // Convert to ArchitectureModel if needed
      const model = this.isArchitectureModel(architecture) ? 
        architecture as ArchitectureModel : 
        this.convertToArchitectureModel(architecture);

      // Prepare render options
      const renderOptions: RenderOptions = {
        format: format || 'dsl',
        viewType: 'landscape',
        includeMetadata: true,
        ...options
      };

      return this.rendererRegistry.render(rendererName, model, renderOptions);
    } catch (error) {
      return throwError(() => error);
    }
  }

  // Render with multiple renderers for comparison
  renderMultiple(
    architecture: Architecture | ArchitectureModel,
    rendererConfigs: Array<{ renderer: string; format?: string; options?: Partial<RenderOptions> }>
  ): Observable<DiagramOutput[]> {
    const model = this.isArchitectureModel(architecture) ? 
      architecture as ArchitectureModel : 
      this.convertToArchitectureModel(architecture);

    const renderPromises = rendererConfigs.map(config => 
      this.renderDiagram(model, config.renderer, config.format, config.options).toPromise()
    );

    return new Observable(observer => {
      Promise.all(renderPromises)
        .then(results => {
          observer.next(results.filter(result => result !== undefined) as DiagramOutput[]);
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  // Get available renderers
  getAvailableRenderers(): string[] {
    return this.rendererRegistry.getRendererNames();
  }

  // Get supported formats for a renderer
  getSupportedFormats(rendererName?: string): string[] {
    if (rendererName) {
      const renderer = this.rendererRegistry.getRenderer(rendererName);
      return renderer ? [...renderer.supportedFormats] : [];
    }
    return this.rendererRegistry.getSupportedFormats();
  }

  // Validate architecture model
  validateArchitecture(architecture: Architecture | ArchitectureModel): ValidationResult {
    const model = this.isArchitectureModel(architecture) ? 
      architecture as ArchitectureModel : 
      this.convertToArchitectureModel(architecture);

    return ArchitectureModelAnalyzer.validate(model);
  }

  // Analyze architecture model
  analyzeArchitecture(architecture: Architecture | ArchitectureModel): any {
    const model = this.isArchitectureModel(architecture) ? 
      architecture as ArchitectureModel : 
      this.convertToArchitectureModel(architecture);

    const basicAnalysis = ArchitectureModelAnalyzer.analyze(model);
    
    // Add renderer-specific analysis
    const rendererAnalysis: Record<string, any> = {};
    this.rendererRegistry.getAllRenderers().forEach(renderer => {
      if ('analyzeModel' in renderer && typeof renderer.analyzeModel === 'function') {
        try {
          rendererAnalysis[renderer.name] = renderer.analyzeModel(model);
        } catch (error) {
          rendererAnalysis[renderer.name] = { error: `Analysis failed: ${error}` };
        }
      }
    });

    return {
      basic: basicAnalysis,
      renderers: rendererAnalysis,
      capabilities: this.rendererRegistry.getCapabilitiesSummary()
    };
  }

  // Get diagram tabs for UI
  getDiagramTabs(): DiagramTab[] {
    const tabs: DiagramTab[] = [];
    
    this.rendererRegistry.getAllRenderers().forEach(renderer => {
      renderer.supportedFormats.forEach(format => {
        tabs.push({
          id: `${renderer.name}-${format}`,
          label: this.formatTabLabel(renderer.name, format),
          icon: this.getIconForRenderer(renderer.name),
          tooltip: `${renderer.description} - ${format.toUpperCase()}`,
          renderer: renderer.name,
          format: format,
          capabilities: renderer.getCapabilities()
        });
      });
    });

    return tabs.sort((a, b) => this.getTabPriority(a) - this.getTabPriority(b));
  }

  // Check if renderer supports specific view type
  supportsViewType(rendererName: string, viewType: ViewType): boolean {
    const renderer = this.rendererRegistry.getRenderer(rendererName);
    if (!renderer) return false;

    const capabilities = renderer.getCapabilities();
    return capabilities.multipleViews || viewType === 'landscape';
  }

  // Get renderer metadata
  getRendererInfo(rendererName: string): any {
    const renderer = this.rendererRegistry.getRenderer(rendererName);
    if (!renderer) return null;

    return {
      name: renderer.name,
      description: renderer.description,
      version: renderer.version,
      supportedFormats: [...renderer.supportedFormats],
      capabilities: renderer.getCapabilities(),
      metadata: renderer.getMetadata()
    };
  }

  // Get renderer registry for direct access
  getRendererRegistry(): RendererRegistryService {
    return this.rendererRegistry;
  }

  // Export diagram content
  exportDiagram(content: string, format: string, filename?: string): void {
    const blob = new Blob([content], { 
      type: this.getMimeTypeForFormat(format) 
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `architecture-diagram.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Copy content to clipboard
  copyToClipboard(content: string): Promise<void> {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(content);
    } else {
      // Fallback for older browsers
      return new Promise((resolve, reject) => {
        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
          document.execCommand('copy');
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          document.body.removeChild(textArea);
        }
      });
    }
  }

  private formatTabLabel(rendererName: string, format: string): string {
    const rendererLabels: Record<string, string> = {
      'structurizr': 'Structurizr',
      'likec4': 'LikeC4'
    };

    const formatLabels: Record<string, string> = {
      'dsl': 'DSL',
      'plantuml': 'PlantUML',
      'mermaid': 'Mermaid'
    };

    const renderer = rendererLabels[rendererName] || rendererName;
    const formatLabel = formatLabels[format] || format.toUpperCase();

    return `${renderer} ${formatLabel}`;
  }

  private getIconForRenderer(rendererName: string): string {
    const icons: Record<string, string> = {
      'structurizr': 'pi pi-code',
      'likec4': 'pi pi-objects-column',
      'plantuml': 'pi pi-file-edit',
      'graph': 'pi pi-sitemap',
      'mermaid': 'pi pi-share-alt'
    };
    return icons[rendererName] || 'pi pi-diagram-tree';
  }

  private getTabPriority(tab: DiagramTab): number {
    // Define priority order
    const priorities: Record<string, number> = {
      'structurizr-dsl': 10,
      'structurizr-plantuml': 20,
      'likec4-dsl': 30
    };
    return priorities[tab.id] || 100;
  }

  private getMimeTypeForFormat(format: string): string {
    const mimeTypes: Record<string, string> = {
      'dsl': 'text/plain',
      'plantuml': 'text/plain',
      'mermaid': 'text/plain',
      'json': 'application/json',
      'svg': 'image/svg+xml',
      'png': 'image/png'
    };
    return mimeTypes[format] || 'text/plain';
  }
}

// Supporting interfaces
export interface DiagramTab {
  id: string;
  label: string;
  icon: string;
  tooltip: string;
  renderer: string;
  format: string;
  capabilities?: any;
}

export interface RenderConfig {
  renderer: string;
  format: string;
  viewType?: ViewType;
  options?: RenderOptions;
}

export interface DiagramExportOptions {
  format: string;
  filename?: string;
  includeMetadata?: boolean;
  timestamp?: boolean;
}