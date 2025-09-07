import { Observable } from 'rxjs';
import { ArchitectureModel, ValidationResult } from '../models/architecture.model';

// Base renderer interface for all diagram renderers
export interface BaseRenderer<TOutput = DiagramOutput> {
  readonly name: string;
  readonly description: string;
  readonly supportedFormats: readonly string[];
  readonly version: string;

  // Core rendering method
  render(architecture: ArchitectureModel, options?: RenderOptions): TOutput | Observable<TOutput>;

  // Validation
  validate(architecture: ArchitectureModel): ValidationResult;

  // Capabilities
  supportsFormat(format: string): boolean;
  getCapabilities(): RendererCapabilities;

  // Metadata
  getMetadata(): RendererMetadata;
}

// Standard diagram output interface
export interface DiagramOutput {
  readonly content: string;
  readonly format: OutputFormat;
  readonly metadata: DiagramMetadata;
  readonly rendererName: string;
  readonly timestamp: Date;
}

// Render options for customization
export interface RenderOptions {
  format?: string;
  viewType?: ViewType;
  theme?: string;
  includeMetadata?: boolean;
  customProperties?: Record<string, any>;
  filters?: ElementFilter[];
  layout?: LayoutOptions;
}

// Layout configuration
export interface LayoutOptions {
  direction?: 'TOP_BOTTOM' | 'BOTTOM_TOP' | 'LEFT_RIGHT' | 'RIGHT_LEFT';
  spacing?: {
    node?: number;
    rank?: number;
  };
  autoLayout?: boolean;
}

// Element filtering
export interface ElementFilter {
  layer?: 'business' | 'application' | 'technology';
  elementType?: string;
  tags?: string[];
  properties?: Record<string, string>;
  include?: boolean; // true = include only these, false = exclude these
}

// View types supported by renderers
export type ViewType = 
  | 'landscape' 
  | 'system-context' 
  | 'container' 
  | 'component'
  | 'deployment'
  | 'dynamic';

// Output formats
export type OutputFormat = 
  | 'dsl' 
  | 'plantuml' 
  | 'mermaid' 
  | 'json' 
  | 'svg' 
  | 'png'
  | 'html'
  | 'visjs'
  | 'c4'
  | 'deployment'
  | 'component'
  | 'sequence';

// Renderer capabilities
export interface RendererCapabilities {
  multipleViews: boolean;
  customThemes: boolean;
  interactivity: boolean;
  exportFormats: readonly OutputFormat[];
  layoutAlgorithms: readonly string[];
  filteringSupport: boolean;
  relationshipTypes: readonly string[];
}

// Renderer metadata
export interface RendererMetadata {
  author: string;
  license: string;
  homepage?: string;
  repository?: string;
  tags: readonly string[];
  dependencies?: readonly string[];
}

// Diagram metadata
export interface DiagramMetadata {
  title?: string;
  description?: string;
  viewType: ViewType;
  elementCount: number;
  relationshipCount: number;
  layerDistribution: {
    business: number;
    application: number;
    technology: number;
  };
  renderingTime?: number; // in milliseconds
  warnings?: string[];
  // Extended properties for specialized renderers
  nodeCount?: number; // for graph renderer
  edgeCount?: number; // for graph renderer
  diagramType?: string; // for plantuml renderer
}

// Abstract base renderer class with common functionality
export abstract class AbstractRenderer<TOutput = DiagramOutput> implements BaseRenderer<TOutput> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly supportedFormats: readonly string[];
  abstract readonly version: string;

  // Abstract methods that must be implemented
  abstract render(architecture: ArchitectureModel, options?: RenderOptions): TOutput | Observable<TOutput>;
  abstract getCapabilities(): RendererCapabilities;
  abstract getMetadata(): RendererMetadata;

  // Default implementations
  validate(architecture: ArchitectureModel): ValidationResult {
    // Basic validation - can be overridden
    if (!architecture.uid || !architecture.name) {
      return {
        isValid: false,
        errors: [{
          code: 'INVALID_MODEL',
          message: 'Architecture model must have uid and name',
          severity: 'error'
        }],
        warnings: []
      };
    }

    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  supportsFormat(format: string): boolean {
    return this.supportedFormats.includes(format);
  }

  // Helper methods for subclasses
  protected sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '_');
  }

  protected extractElementId(element: any): string {
    if (typeof element === 'object' && element?.uid) {
      return element.uid;
    }
    return String(element);
  }

  protected createDiagramMetadata(
    architecture: ArchitectureModel, 
    viewType: ViewType, 
    renderingTime?: number
  ): DiagramMetadata {
    const businessCount = (architecture.businessLayer?.actors?.length || 0) +
                         (architecture.businessLayer?.services?.length || 0) +
                         (architecture.businessLayer?.capabilities?.length || 0);
    
    const applicationCount = (architecture.applicationLayer?.applications?.length || 0) +
                            (architecture.applicationLayer?.components?.length || 0) +
                            (architecture.applicationLayer?.services?.length || 0);
    
    const technologyCount = (architecture.technologyLayer?.nodes?.length || 0) +
                           (architecture.technologyLayer?.services?.length || 0) +
                           (architecture.technologyLayer?.systemSoftware?.length || 0);

    return {
      title: architecture.name,
      description: architecture.description,
      viewType,
      elementCount: businessCount + applicationCount + technologyCount,
      relationshipCount: architecture.relationships?.length || 0,
      layerDistribution: {
        business: businessCount,
        application: applicationCount,
        technology: technologyCount
      },
      renderingTime,
      warnings: []
    };
  }

  protected logRenderingInfo(architecture: ArchitectureModel, format: string): void {
    console.log(`[${this.name}] Rendering ${architecture.name} as ${format}`, {
      elements: this.createDiagramMetadata(architecture, 'landscape').elementCount,
      relationships: architecture.relationships?.length || 0,
      renderer: this.name,
      version: this.version
    });
  }
}