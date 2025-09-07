import { Injectable } from '@angular/core';
import {
  AbstractRenderer,
  DiagramOutput,
  RenderOptions,
  RendererCapabilities,
  RendererMetadata,
  ViewType
} from './base-renderer.interface';
import { ArchitectureModel } from '../models/architecture.model';
import type {
  BusinessActor,
  Application,
  ApplicationComponent,
  BusinessService,
  ApplicationService,
  TechnologyNode,
  SystemSoftware,
  TechnologyService,
  Relationship
} from '../../generated/api';

// Internal interfaces for LikeC4 rendering
interface LikeC4Element {
  id: string;
  name: string;
  description?: string;
  kind: 'actor' | 'system' | 'component' | 'service' | 'infrastructure';
  technology?: string;
  tags?: string[];
  properties?: Record<string, string>;
  children?: LikeC4Element[];
}

interface LikeC4Relationship {
  source: string;
  target: string;
  title?: string;
  description?: string;
  technology?: string;
  kind?: string;
  tags?: string[];
}

interface LikeC4Model {
  name: string;
  description: string;
  elements: LikeC4Element[];
  relationships: LikeC4Relationship[];
  views: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LikeC4Renderer extends AbstractRenderer<DiagramOutput> {
  readonly name = 'likec4';
  readonly description = 'LikeC4 modern architecture diagram renderer';
  readonly supportedFormats = ['dsl'] as const;
  readonly version = '1.0.0';

  render(architecture: ArchitectureModel, options?: RenderOptions): DiagramOutput {
    const startTime = Date.now();
    this.logRenderingInfo(architecture, options?.format || 'dsl');

    // Convert architecture to LikeC4 model
    const likeC4Model = this.mapToLikeC4Model(architecture);

    // Generate DSL content
    const content = this.generateLikeC4DSL(likeC4Model, options?.viewType || 'landscape');

    const renderingTime = Date.now() - startTime;
    const metadata = this.createDiagramMetadata(architecture, options?.viewType || 'landscape', renderingTime);

    return {
      content,
      format: 'dsl',
      metadata: {
        ...metadata,
        warnings: this.validateLikeC4Model(likeC4Model)
      },
      rendererName: this.name,
      timestamp: new Date()
    };
  }

  getCapabilities(): RendererCapabilities {
    return {
      multipleViews: true,
      customThemes: true,
      interactivity: false,
      exportFormats: ['dsl'],
      layoutAlgorithms: ['auto', 'hierarchical'],
      filteringSupport: true,
      relationshipTypes: ['uses', 'calls', 'contains', 'extends', 'implements']
    };
  }

  getMetadata(): RendererMetadata {
    return {
      author: 'Architecture as Code Studio',
      license: 'MIT',
      homepage: 'https://likec4.dev',
      repository: 'https://github.com/likec4/likec4',
      tags: ['likec4', 'c4', 'dsl', 'modern', 'architecture'],
      dependencies: []
    };
  }

  private mapToLikeC4Model(architecture: ArchitectureModel): LikeC4Model {
    const elements: LikeC4Element[] = [];
    const relationships: LikeC4Relationship[] = [];

    // Map business actors
    if (architecture.businessLayer?.actors) {
      elements.push(...this.mapBusinessActors(architecture.businessLayer.actors));
    }

    // Map applications as systems with nested components
    if (architecture.applicationLayer?.applications) {
      elements.push(...this.mapApplicationsAsSystems(
        architecture.applicationLayer.applications,
        architecture.applicationLayer.components || []
      ));
    }

    // Map standalone services
    const services = [
      ...(architecture.businessLayer?.services || []),
      ...(architecture.applicationLayer?.services || [])
    ];
    if (services.length > 0) {
      elements.push(...this.mapServices(services));
    }

    // Map technology infrastructure
    if (architecture.technologyLayer) {
      elements.push(...this.mapInfrastructure(
        architecture.technologyLayer.nodes || [],
        architecture.technologyLayer.systemSoftware || [],
        architecture.technologyLayer.services || []
      ));
    }

    // Map relationships
    if (architecture.relationships) {
      relationships.push(...this.mapRelationships(architecture.relationships));
    }

    // Generate available views
    const views = this.generateViewList(elements);

    return {
      name: architecture.name,
      description: architecture.description || '',
      elements,
      relationships,
      views
    };
  }

  private mapBusinessActors(actors: BusinessActor[]): LikeC4Element[] {
    return actors
      .filter(actor => actor.uid && actor.name)
      .map(actor => ({
        id: this.sanitizeId(actor.uid!),
        name: actor.name!,
        description: actor.description,
        kind: 'actor' as const,
        tags: [
          'business',
          ...(actor.actorType ? [actor.actorType.toLowerCase()] : [])
        ],
        properties: {
          layer: 'business',
          type: actor.actorType || 'unknown',
          ...(actor.properties || {})
        }
      }));
  }

  private mapApplicationsAsSystems(
    applications: Application[], 
    components: ApplicationComponent[]
  ): LikeC4Element[] {
    return applications
      .filter(app => app.uid && app.name)
      .map((app, index) => {
        // Distribute components across applications
        const componentsPerApp = Math.ceil(components.length / applications.length);
        const startIndex = index * componentsPerApp;
        const appComponents = components.slice(startIndex, startIndex + componentsPerApp);

        return {
          id: this.sanitizeId(app.uid!),
          name: app.name!,
          description: app.description,
          kind: 'system' as const,
          tags: [
            'application',
            ...(app.stereoType ? [app.stereoType.toLowerCase().replace('_', '-')] : []),
            ...(app.lifecycle ? [`lifecycle-${app.lifecycle.toLowerCase()}`] : [])
          ],
          properties: {
            layer: 'application',
            stereoType: app.stereoType || 'unknown',
            lifecycle: app.lifecycle || 'unknown'
          },
          children: appComponents.map(comp => ({
            id: this.sanitizeId(comp.uid!),
            name: comp.name!,
            description: comp.description,
            kind: this.mapComponentKind(comp.componentType),
            technology: comp.technology,
            tags: [
              'application',
              ...(comp.componentType ? [comp.componentType.toLowerCase()] : [])
            ],
            properties: {
              layer: 'application',
              type: comp.componentType || 'unknown',
              ...(comp.properties || {})
            }
          })).filter(comp => comp.id && comp.name)
        };
      });
  }

  private mapServices(services: (BusinessService | ApplicationService)[]): LikeC4Element[] {
    return services
      .filter(service => service.uid && service.name)
      .map(service => {
        const isBusinessService = 'serviceLevel' in service;
        return {
          id: this.sanitizeId(service.uid!),
          name: service.name!,
          description: service.description,
          kind: 'service' as const,
          tags: [
            isBusinessService ? 'business' : 'application',
            'service'
          ],
          properties: {
            layer: isBusinessService ? 'business' : 'application',
            ...(isBusinessService && 'serviceLevel' in service ? 
              { serviceLevel: service.serviceLevel, availability: service.availability } : 
              {}),
            ...(service.properties || {})
          }
        };
      });
  }

  private mapInfrastructure(
    nodes: TechnologyNode[],
    systemSoftware: SystemSoftware[],
    services: TechnologyService[]
  ): LikeC4Element[] {
    const infrastructureElements: LikeC4Element[] = [];

    // Map technology nodes
    infrastructureElements.push(...nodes
      .filter(node => node.uid && node.name)
      .map(node => ({
        id: this.sanitizeId(node.uid!),
        name: node.name!,
        description: node.description,
        kind: 'infrastructure' as const,
        technology: node.operatingSystem,
        tags: [
          'technology',
          'infrastructure',
          ...(node.nodeType ? [node.nodeType.toLowerCase()] : [])
        ],
        properties: {
          layer: 'technology',
          nodeType: node.nodeType || 'unknown',
          location: node.location || '',
          capacity: node.capacity || '',
          operatingSystem: node.operatingSystem || ''
        }
      })));

    // Map system software
    infrastructureElements.push(...systemSoftware
      .filter(software => software.uid && software.name)
      .map(software => ({
        id: this.sanitizeId(software.uid!),
        name: software.name!,
        description: software.description,
        kind: 'infrastructure' as const,
        technology: `${software.vendor || 'Unknown'} ${software.version || ''}`.trim(),
        tags: [
          'technology',
          'software',
          ...(software.softwareType ? [software.softwareType.toLowerCase()] : [])
        ],
        properties: {
          layer: 'technology',
          softwareType: software.softwareType || 'unknown',
          vendor: software.vendor || '',
          version: software.version || ''
        }
      })));

    // Map technology services
    infrastructureElements.push(...services
      .filter(service => service.uid && service.name)
      .map(service => ({
        id: this.sanitizeId(service.uid!),
        name: service.name!,
        description: service.description,
        kind: 'service' as const,
        technology: service.provider,
        tags: [
          'technology',
          'service',
          ...(service.serviceCategory ? [service.serviceCategory.toLowerCase()] : [])
        ],
        properties: {
          layer: 'technology',
          serviceCategory: service.serviceCategory || 'unknown',
          provider: service.provider || ''
        }
      })));

    return infrastructureElements;
  }

  private mapRelationships(relationships: Relationship[]): LikeC4Relationship[] {
    return relationships
      .filter(rel => rel.source && rel.target)
      .map(rel => ({
        source: this.sanitizeId(this.extractElementId(rel.source)),
        target: this.sanitizeId(this.extractElementId(rel.target)),
        title: rel.description,
        description: rel.description,
        technology: rel.properties?.['technology'],
        kind: this.mapRelationshipKind(rel.relationshipType),
        tags: [rel.relationshipType?.toLowerCase() || 'association']
      }));
  }

  private mapComponentKind(componentType?: string): 'component' | 'service' | 'infrastructure' {
    if (!componentType) return 'component';
    
    const type = componentType.toLowerCase();
    if (type.includes('service')) return 'service';
    if (type.includes('database') || type.includes('storage')) return 'infrastructure';
    return 'component';
  }

  private mapRelationshipKind(relationshipType?: string): string {
    switch (relationshipType) {
      case 'FLOW': return 'calls';
      case 'SERVING': return 'uses';
      case 'ACCESS': return 'uses';
      case 'TRIGGERING': return 'calls';
      case 'COMPOSITION': return 'contains';
      case 'AGGREGATION': return 'contains';
      default: return 'uses';
    }
  }

  private generateViewList(elements: LikeC4Element[]): string[] {
    const views = ['landscape'];
    
    const hasActors = elements.some(e => e.kind === 'actor');
    const hasSystems = elements.some(e => e.kind === 'system');
    const hasComponents = elements.some(e => e.children?.length);
    
    if (hasActors && hasSystems) {
      views.push('system-context');
    }
    
    if (hasSystems && hasComponents) {
      views.push('container');
    }
    
    if (hasComponents) {
      views.push('component');
    }
    
    return views;
  }

  private generateLikeC4DSL(model: LikeC4Model, viewType: ViewType): string {
    let dsl = `specification {\n`;
    
    // Define element types
    const elementKinds = new Set(model.elements.map(e => e.kind));
    elementKinds.forEach(kind => {
      dsl += `  element ${kind}\n`;
    });
    
    dsl += `\n`;
    
    // Define relationship types
    const relationshipKinds = new Set(model.relationships.map(r => r.kind || 'uses'));
    relationshipKinds.forEach(kind => {
      dsl += `  relationship ${kind}\n`;
    });
    
    dsl += `}\n\n`;
    
    // Model section
    dsl += `model {\n`;
    
    // Add elements
    model.elements.forEach(element => {
      dsl += this.generateElementDSL(element, '  ');
    });
    
    // Add relationships
    if (model.relationships.length > 0) {
      dsl += `\n  # Relationships\n`;
      model.relationships.forEach(rel => {
        dsl += `  ${rel.source} -> ${rel.target}`;
        if (rel.title) {
          dsl += ` '${rel.title}'`;
        }
        if (rel.kind && rel.kind !== 'uses') {
          dsl += ` {\n    kind: ${rel.kind}\n  }`;
        }
        dsl += `\n`;
      });
    }
    
    dsl += `}\n\n`;
    
    // Views section
    dsl += `views {\n`;
    
    // Generate views based on available elements
    if (viewType === 'landscape' || viewType === 'system-context') {
      dsl += `  view landscape 'Architecture Landscape' {\n`;
      dsl += `    include *\n`;
      dsl += `    style * {\n`;
      dsl += `      color: primary\n`;
      dsl += `    }\n`;
      dsl += `  }\n\n`;
    }
    
    // System context views
    const systems = model.elements.filter(e => e.kind === 'system');
    if (systems.length > 0 && (viewType === 'system-context' || viewType === 'container')) {
      const mainSystem = systems[0];
      dsl += `  view systemContext of ${mainSystem.id} 'System Context' {\n`;
      dsl += `    include *\n`;
      dsl += `    exclude -> *.infrastructure.*\n`;
      dsl += `    style ${mainSystem.id} {\n`;
      dsl += `      color: green\n`;
      dsl += `    }\n`;
      dsl += `  }\n\n`;
      
      // Container view
      if (mainSystem.children && mainSystem.children.length > 0) {
        dsl += `  view containers of ${mainSystem.id} 'Container View' {\n`;
        dsl += `    include ${mainSystem.id}.*\n`;
        dsl += `    include -> ${mainSystem.id}.*\n`;
        dsl += `  }\n\n`;
      }
    }
    
    dsl += `}\n`;
    
    return dsl;
  }

  private generateElementDSL(element: LikeC4Element, indent: string): string {
    let dsl = `${indent}${element.id} = ${element.kind} '${element.name}'`;
    
    const hasProperties = element.description || element.technology || (element.properties && Object.keys(element.properties).length > 0);
    const hasChildren = element.children && element.children.length > 0;
    
    if (hasProperties || hasChildren) {
      dsl += ` {\n`;
      
      if (element.description) {
        dsl += `${indent}  description '${element.description}'\n`;
      }
      
      if (element.technology) {
        dsl += `${indent}  technology '${element.technology}'\n`;
      }
      
      if (element.tags && element.tags.length > 0) {
        dsl += `${indent}  tags ${element.tags.map(t => `#${t}`).join(' ')}\n`;
      }
      
      // Add children
      if (element.children) {
        if (element.description || element.technology || element.tags) {
          dsl += `\n`;
        }
        element.children.forEach(child => {
          dsl += this.generateElementDSL(child, indent + '  ');
        });
      }
      
      dsl += `${indent}}\n`;
    } else {
      dsl += `\n`;
    }
    
    return dsl;
  }

  private validateLikeC4Model(model: LikeC4Model): string[] {
    const warnings: string[] = [];
    
    // Check for empty model
    if (model.elements.length === 0) {
      warnings.push('Model contains no elements');
    }
    
    // Check for orphaned elements (no relationships)
    if (model.relationships.length === 0 && model.elements.length > 1) {
      warnings.push('Model elements have no relationships defined');
    }
    
    // Check for missing descriptions
    const elementsWithoutDescription = model.elements.filter(e => !e.description);
    if (elementsWithoutDescription.length > 0) {
      warnings.push(`${elementsWithoutDescription.length} elements missing descriptions`);
    }
    
    // Check for duplicate IDs
    const ids = model.elements.map(e => e.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      warnings.push(`Duplicate element IDs found: ${duplicateIds.join(', ')}`);
    }
    
    return warnings;
  }

  // Public method for analyzing model
  analyzeModel(architecture: ArchitectureModel): any {
    const likeC4Model = this.mapToLikeC4Model(architecture);
    return {
      elements: {
        total: likeC4Model.elements.length,
        byKind: this.groupElementsByKind(likeC4Model.elements),
        withChildren: likeC4Model.elements.filter(e => e.children?.length).length
      },
      relationships: likeC4Model.relationships.length,
      views: likeC4Model.views.length,
      warnings: this.validateLikeC4Model(likeC4Model),
      modelComplexity: this.calculateComplexity(likeC4Model)
    };
  }

  private groupElementsByKind(elements: LikeC4Element[]): Record<string, number> {
    return elements.reduce((acc, element) => {
      acc[element.kind] = (acc[element.kind] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateComplexity(model: LikeC4Model): 'low' | 'medium' | 'high' {
    const totalElements = model.elements.length;
    const totalRelationships = model.relationships.length;
    const complexity = totalElements + (totalRelationships * 2);
    
    if (complexity < 10) return 'low';
    if (complexity < 50) return 'medium';
    return 'high';
  }
}