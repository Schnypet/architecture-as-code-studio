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
  TechnologyNode,
  SystemSoftware,
  Relationship
} from '../../generated/api';

@Injectable({
  providedIn: 'root'
})
export class PlantUMLRenderer extends AbstractRenderer<DiagramOutput> {
  readonly name = 'plantuml';
  readonly description = 'PlantUML diagram generator for various diagram types';
  readonly supportedFormats = ['c4', 'deployment', 'component', 'sequence'] as const;
  readonly version = '1.0.0';

  render(architecture: ArchitectureModel, options?: RenderOptions): DiagramOutput {
    const startTime = Date.now();
    this.logRenderingInfo(architecture, options?.format || 'c4');

    const format = options?.format || 'c4';
    let content: string;

    switch (format) {
      case 'c4':
        content = this.generateC4Diagram(architecture, options?.viewType || 'system-context');
        break;
      case 'deployment':
        content = this.generateDeploymentDiagram(architecture);
        break;
      case 'component':
        content = this.generateComponentDiagram(architecture);
        break;
      case 'sequence':
        content = this.generateSequenceDiagram(architecture);
        break;
      default:
        content = this.generateC4Diagram(architecture, 'system-context');
    }

    const renderingTime = Date.now() - startTime;
    const metadata = this.createDiagramMetadata(architecture, options?.viewType || 'landscape', renderingTime);

    return {
      content,
      format: format as any,
      metadata,
      rendererName: this.name,
      timestamp: new Date()
    };
  }

  getCapabilities(): RendererCapabilities {
    return {
      multipleViews: true,
      customThemes: false,
      interactivity: false,
      exportFormats: ['c4', 'deployment', 'component', 'sequence'],
      layoutAlgorithms: ['auto'],
      filteringSupport: true,
      relationshipTypes: ['uses', 'contains', 'calls', 'implements']
    };
  }

  getMetadata(): RendererMetadata {
    return {
      author: 'Architecture as Code Studio',
      license: 'MIT',
      homepage: 'https://plantuml.com',
      repository: 'https://github.com/plantuml/plantuml',
      tags: ['plantuml', 'uml', 'c4', 'diagrams'],
      dependencies: ['plantuml-encoder']
    };
  }

  private generateC4Diagram(architecture: ArchitectureModel, viewType: ViewType): string {
    let plantuml = '@startuml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml\n\n';

    // Add custom styling for different application types and lifecycle states
    plantuml += this.generateC4Styling() + '\n';

    plantuml += `title ${architecture.name} - ${this.formatViewType(viewType)}\n\n`;

    // Add persons (business actors)
    if (architecture.businessLayer?.actors) {
      architecture.businessLayer.actors.forEach(actor => {
        if (actor.uid && actor.name) {
          const id = this.sanitizeId(actor.uid);
          const external = actor.actorType === 'EXTERNAL' ? '_Ext' : '';
          plantuml += `Person${external}(${id}, "${actor.name}", "${actor.description || ''}")\n`;
        }
      });
    }

    if (viewType === 'system-context' || viewType === 'landscape' || viewType === 'container' || viewType === 'component') {
      // Add systems (applications) with proper C4 mapping
      if (architecture.applicationLayer?.applications) {
        architecture.applicationLayer.applications.forEach(app => {
          if (app.uid && app.name) {
            const id = this.sanitizeId(app.uid);
            const c4Element = this.mapApplicationToC4System(app);
            plantuml += `${c4Element.type}(${id}, "${app.name}", "${app.description || ''}")\n`;
          }
        });
      }
    }
    if (viewType === 'container') {
      // Add containers (application components) with enhanced C4 mapping
      if (architecture.applicationLayer?.components) {
        architecture.applicationLayer.components.forEach(component => {
          if (component.uid && component.name) {
            const id = this.sanitizeId(component.uid);
            const c4Element = this.mapApplicationComponentToC4Container(component);
            plantuml += `${c4Element.type}(${id}, "${component.name}", "${component.technology || 'Technology'}", "${component.description || ''}")\n`;
          }
        });
      }

      // Also show parent applications as system boundaries
      if (architecture.applicationLayer?.applications) {
        architecture.applicationLayer.applications.forEach(app => {
          if (app.uid && app.name) {
            const id = this.sanitizeId(app.uid);
            plantuml += `System_Boundary(${id}_boundary, "${app.name} System") {\n`;

            // Find components belonging to this application
            const appComponents = architecture.applicationLayer?.components?.filter(comp =>
              comp.properties?.['parentApplication'] === app.uid ||
              comp.properties?.['application'] === app.name
            );

            if (appComponents && appComponents.length > 0) {
              appComponents.forEach(comp => {
                if (comp.uid && comp.name) {
                  const compId = this.sanitizeId(comp.uid);
                  const c4Element = this.mapApplicationComponentToC4Container(comp);
                  plantuml += `  ${c4Element.type}(${compId}, "${comp.name}", "${comp.technology || 'Technology'}", "${comp.description || ''}")\n`;
                }
              });
            }

            plantuml += '}\n\n';
          }
        });
      }
    } else if (viewType === 'component') {
      // Add components
      if (architecture.applicationLayer?.components) {
        architecture.applicationLayer.components.forEach(component => {
          if (component.uid && component.name) {
            const id = this.sanitizeId(component.uid);
            plantuml += `Component(${id}, "${component.name}", "${component.technology || 'Technology'}", "${component.description || ''}")\n`;
          }
        });
      }
    }

    // Add external systems (technology nodes)
    if (architecture.technologyLayer?.nodes) {
      architecture.technologyLayer.nodes.forEach(node => {
        if (node.uid && node.name) {
          const id = this.sanitizeId(node.uid);
          plantuml += `System_Ext(${id}, "${node.name}", "${node.description || ''}")\n`;
        }
      });
    }

    // Add relationships with enhanced C4 mapping
    if (architecture.relationships) {
      plantuml += '\n';
      architecture.relationships.forEach(rel => {
        if (rel.source && rel.target) {
          const sourceId = this.sanitizeId(this.extractElementId(rel.source));
          const targetId = this.sanitizeId(this.extractElementId(rel.target));
          const c4Relationship = this.mapRelationshipToC4(rel, viewType);
          plantuml += `${c4Relationship.type}(${sourceId}, ${targetId}, "${rel.description || c4Relationship.defaultLabel}", "${this.getRelationshipTech(rel)}")\n`;
        }
      });
    }

    plantuml += '\n@enduml';
    return plantuml;
  }

  private generateDeploymentDiagram(architecture: ArchitectureModel): string {
    let plantuml = '@startuml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml\n\n';

    plantuml += `title ${architecture.name} - Deployment View\n\n`;

    // Add deployment nodes
    if (architecture.technologyLayer?.nodes) {
      architecture.technologyLayer.nodes.forEach(node => {
        if (node.uid && node.name) {
          const id = this.sanitizeId(node.uid);
          plantuml += `Deployment_Node(${id}, "${node.name}", "${node.operatingSystem || 'OS'}", "${node.description || ''}") {\n`;

          // Add software deployed on this node
          if (architecture.technologyLayer?.systemSoftware) {
            architecture.technologyLayer.systemSoftware
              .filter(sw => sw.uid && sw.name)
              .forEach(software => {
                const swId = this.sanitizeId(software.uid!);
                plantuml += `  Container(${swId}, "${software.name}", "${software.vendor || 'Vendor'} ${software.version || ''}", "${software.description || ''}")\n`;
              });
          }

          plantuml += '}\n\n';
        }
      });
    }

    // Add relationships
    if (architecture.relationships) {
      architecture.relationships.forEach(rel => {
        if (rel.source && rel.target) {
          const sourceId = this.sanitizeId(this.extractElementId(rel.source));
          const targetId = this.sanitizeId(this.extractElementId(rel.target));
          plantuml += `Rel(${sourceId}, ${targetId}, "${rel.description || ''}", "${this.getRelationshipTech(rel)}")\n`;
        }
      });
    }

    plantuml += '\n@enduml';
    return plantuml;
  }

  private generateComponentDiagram(architecture: ArchitectureModel): string {
    let plantuml = '@startuml\n';
    plantuml += `title ${architecture.name} - Component View\n\n`;

    // Add packages for different layers
    plantuml += 'package "Business Layer" {\n';
    if (architecture.businessLayer?.actors) {
      architecture.businessLayer.actors.forEach(actor => {
        if (actor.uid && actor.name) {
          const id = this.sanitizeId(actor.uid);
          plantuml += `  actor ${id} as "${actor.name}"\n`;
        }
      });
    }
    plantuml += '}\n\n';

    plantuml += 'package "Application Layer" {\n';
    if (architecture.applicationLayer?.applications) {
      architecture.applicationLayer.applications.forEach(app => {
        if (app.uid && app.name) {
          const id = this.sanitizeId(app.uid);
          plantuml += `  component ${id} as "${app.name}"\n`;
        }
      });
    }

    if (architecture.applicationLayer?.components) {
      architecture.applicationLayer.components.forEach(component => {
        if (component.uid && component.name) {
          const id = this.sanitizeId(component.uid);
          const stereotype = component.componentType === 'DATABASE' ? ' <<database>>' : '';
          plantuml += `  component ${id} as "${component.name}"${stereotype}\n`;
        }
      });
    }
    plantuml += '}\n\n';

    plantuml += 'package "Technology Layer" {\n';
    if (architecture.technologyLayer?.nodes) {
      architecture.technologyLayer.nodes.forEach(node => {
        if (node.uid && node.name) {
          const id = this.sanitizeId(node.uid);
          plantuml += `  node ${id} as "${node.name}"\n`;
        }
      });
    }
    plantuml += '}\n\n';

    // Add relationships
    if (architecture.relationships) {
      architecture.relationships.forEach(rel => {
        if (rel.source && rel.target) {
          const sourceId = this.sanitizeId(this.extractElementId(rel.source));
          const targetId = this.sanitizeId(this.extractElementId(rel.target));
          const arrow = this.getUMLArrow(rel.relationshipType);
          plantuml += `${sourceId} ${arrow} ${targetId} : ${rel.description || ''}\n`;
        }
      });
    }

    plantuml += '\n@enduml';
    return plantuml;
  }

  private generateSequenceDiagram(architecture: ArchitectureModel): string {
    let plantuml = '@startuml\n';
    plantuml += `title ${architecture.name} - Sequence View\n\n`;

    // Add participants
    const participants = new Set<string>();

    if (architecture.businessLayer?.actors) {
      architecture.businessLayer.actors.forEach(actor => {
        if (actor.uid && actor.name) {
          const id = this.sanitizeId(actor.uid);
          participants.add(id);
          plantuml += `participant "${actor.name}" as ${id}\n`;
        }
      });
    }

    if (architecture.applicationLayer?.applications) {
      architecture.applicationLayer.applications.forEach(app => {
        if (app.uid && app.name) {
          const id = this.sanitizeId(app.uid);
          participants.add(id);
          plantuml += `participant "${app.name}" as ${id}\n`;
        }
      });
    }

    if (architecture.applicationLayer?.components) {
      architecture.applicationLayer.components.forEach(component => {
        if (component.uid && component.name) {
          const id = this.sanitizeId(component.uid);
          participants.add(id);
          plantuml += `participant "${component.name}" as ${id}\n`;
        }
      });
    }

    plantuml += '\n';

    // Add interactions based on relationships
    if (architecture.relationships) {
      let step = 1;
      architecture.relationships.forEach(rel => {
        if (rel.source && rel.target) {
          const sourceId = this.sanitizeId(this.extractElementId(rel.source));
          const targetId = this.sanitizeId(this.extractElementId(rel.target));

          if (participants.has(sourceId) && participants.has(targetId)) {
            const arrow = rel.relationshipType === 'FLOW' ? '->>' : '->';
            plantuml += `${sourceId} ${arrow} ${targetId} : ${step}. ${rel.description || 'interaction'}\n`;
            step++;
          }
        }
      });
    }

    plantuml += '\n@enduml';
    return plantuml;
  }

  private formatViewType(viewType: ViewType): string {
    switch (viewType) {
      case 'system-context': return 'System Context';
      case 'container': return 'Container View';
      case 'component': return 'Component View';
      case 'landscape': return 'Landscape View';
      default: return 'Architecture View';
    }
  }

  private getRelationshipDirection(type?: string): string {
    switch (type) {
      case 'FLOW': return '_D';
      case 'SERVING': return '_U';
      case 'ACCESS': return '';
      case 'TRIGGERING': return '_R';
      default: return '';
    }
  }

  private getRelationshipTech(rel: any): string {
    if (rel.properties?.['technology']) return rel.properties['technology'];
    if (rel.properties?.['protocol']) return rel.properties['protocol'];
    if (rel.flowType) return rel.flowType;
    if (rel.relationshipType) {
      // Map relationship types to common technologies/protocols
      switch (rel.relationshipType) {
        case 'FLOW': return 'Data Flow';
        case 'SERVING': return 'Service Call';
        case 'ACCESS': return 'Database Access';
        case 'TRIGGERING': return 'Event/Message';
        case 'COMPOSITION': return 'Contains';
        case 'AGGREGATION': return 'Uses';
        default: return rel.relationshipType;
      }
    }
    return '';
  }

  private getUMLArrow(type?: string): string {
    switch (type) {
      case 'FLOW': return '-->';
      case 'SERVING': return '<--';
      case 'ACCESS': return '..>';
      case 'TRIGGERING': return '->';
      case 'COMPOSITION': return '*--';
      case 'AGGREGATION': return 'o--';
      default: return '-->';
    }
  }

  /**
   * Map Application to appropriate C4 System element
   */
  private mapApplicationToC4System(app: Application): { type: string; tags: string } {
    let systemType = 'System';
    let tags = '';

    if (app.stereoType) {
      switch (app.stereoType) {
        case 'BUSINESS_APPLICATION':
          systemType = 'System';
          tags = ', $tags="business"';
          break;
        case 'IT_APPLICATION':
          systemType = 'System';
          tags = ', $tags="internal"';
          break;
        case 'PLATFORM':
          systemType = 'System';
          tags = ', $tags="platform"';
          break;
        case 'INFRASTRUCTURE':
          systemType = 'System_Ext';
          tags = ', $tags="infrastructure"';
          break;
        case 'MICROSOLUTION':
          systemType = 'System';
          tags = ', $tags="micro"';
          break;
      }
    }

    // Add lifecycle-based styling
    if (app.lifecycle) {
      switch (app.lifecycle) {
        case 'PLAN':
          tags += ', $bgColor="lightblue"';
          break;
        case 'DEVELOP':
          tags += ', $bgColor="orange"';
          break;
        case 'ACTIVE':
          tags += ', $bgColor="lightgreen"';
          break;
        case 'PHASEOUT':
          tags += ', $bgColor="yellow"';
          break;
        case 'RETIRE':
          tags += ', $bgColor="gray"';
          break;
      }
    }

    return { type: systemType, tags };
  }

  /**
   * Map ApplicationComponent to appropriate C4 Container element
   */
  private mapApplicationComponentToC4Container(component: ApplicationComponent): { type: string; tags: string } {
    let containerType = 'Container';
    let tags = '';

    if (component.componentType) {
      switch (component.componentType) {
        case 'FRONTEND':
          containerType = 'Container';
          tags = ', $tags="frontend"';
          break;
        case 'BACKEND':
          containerType = 'Container';
          tags = ', $tags="backend"';
          break;
        case 'DATABASE':
          containerType = 'ContainerDb';
          tags = ', $tags="database"';
          break;
        case 'INTEGRATION':
          containerType = 'Container';
          tags = ', $tags="integration"';
          break;
        case 'ANALYTICS':
          containerType = 'Container';
          tags = ', $tags="analytics"';
          break;
      }
    }

    return { type: containerType, tags };
  }

  /**
   * Map Relationship to appropriate C4 relationship
   */
  private mapRelationshipToC4(rel: Relationship, viewType: ViewType): { type: string; defaultLabel: string } {
    let relType = 'Rel';
    let defaultLabel = 'uses';

    if (rel.relationshipType) {
      switch (rel.relationshipType) {
        case 'FLOW':
          relType = 'Rel_D';
          defaultLabel = 'data flows to';
          break;
        case 'SERVING':
          relType = 'Rel_U';
          defaultLabel = 'serves';
          break;
        case 'ACCESS':
          relType = 'Rel';
          defaultLabel = 'reads from/writes to';
          break;
        case 'TRIGGERING':
          relType = 'Rel_R';
          defaultLabel = 'triggers';
          break;
        case 'COMPOSITION':
          relType = 'Rel';
          defaultLabel = 'contains';
          break;
        case 'AGGREGATION':
          relType = 'Rel';
          defaultLabel = 'uses';
          break;
        default:
          relType = 'Rel';
          defaultLabel = 'interacts with';
      }
    }

    return { type: relType, defaultLabel };
  }

  /**
   * Generate C4 custom styling
   */
  private generateC4Styling(): string {
    return `
!define BUSINESS_COLOR #1f77b4
!define PLATFORM_COLOR #ff7f0e
!define INFRASTRUCTURE_COLOR #2ca02c
!define MICRO_COLOR #d62728
!define FRONTEND_COLOR #9467bd
!define BACKEND_COLOR #8c564b
!define DATABASE_COLOR #e377c2
!define INTEGRATION_COLOR #7f7f7f
!define ANALYTICS_COLOR #bcbd22

AddElementTag("business", $bgColor=BUSINESS_COLOR, $fontColor="white")
AddElementTag("platform", $bgColor=PLATFORM_COLOR, $fontColor="white")
AddElementTag("infrastructure", $bgColor=INFRASTRUCTURE_COLOR, $fontColor="white")
AddElementTag("micro", $bgColor=MICRO_COLOR, $fontColor="white")
AddElementTag("frontend", $bgColor=FRONTEND_COLOR, $fontColor="white")
AddElementTag("backend", $bgColor=BACKEND_COLOR, $fontColor="white")
AddElementTag("database", $bgColor=DATABASE_COLOR, $fontColor="white")
AddElementTag("integration", $bgColor=INTEGRATION_COLOR, $fontColor="white")
AddElementTag("analytics", $bgColor=ANALYTICS_COLOR, $fontColor="white")
AddElementTag("internal", $bgColor="#1168bd", $fontColor="white")

LAYOUT_WITH_LEGEND()`;
  }

  // Public method for analyzing model with enhanced C4 analysis
  analyzeModel(architecture: ArchitectureModel): any {
    const elements = {
      actors: architecture.businessLayer?.actors?.length || 0,
      applications: architecture.applicationLayer?.applications?.length || 0,
      components: architecture.applicationLayer?.components?.length || 0,
      nodes: architecture.technologyLayer?.nodes?.length || 0,
      software: architecture.technologyLayer?.systemSoftware?.length || 0
    };

    const relationships = architecture.relationships?.length || 0;
    const totalElements = Object.values(elements).reduce((sum, count) => sum + count, 0);

    // Analyze application types
    const applicationTypes = this.analyzeApplicationTypes(architecture.applicationLayer?.applications || []);

    // Analyze component types
    const componentTypes = this.analyzeComponentTypes(architecture.applicationLayer?.components || []);

    // Analyze relationship patterns
    const relationshipPatterns = this.analyzeRelationshipPatterns(architecture.relationships || []);

    return {
      basic: {
        totalElements,
        relationshipCount: relationships,
        actorCount: elements.actors,
        applicationCount: elements.applications,
        componentCount: elements.components,
        nodeCount: elements.nodes
      },
      applicationTypes,
      componentTypes,
      relationshipPatterns,
      diagramComplexity: this.calculateDiagramComplexity(totalElements, relationships),
      recommendedViews: this.getRecommendedViews(elements),
      c4Recommendations: this.getC4Recommendations(elements, applicationTypes, componentTypes)
    };
  }

  private analyzeApplicationTypes(applications: Application[]): any {
    const types = applications.reduce((acc, app) => {
      const type = app.stereoType || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const lifecycles = applications.reduce((acc, app) => {
      const lifecycle = app.lifecycle || 'UNKNOWN';
      acc[lifecycle] = (acc[lifecycle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { types, lifecycles };
  }

  private analyzeComponentTypes(components: ApplicationComponent[]): any {
    const types = components.reduce((acc, comp) => {
      const type = comp.componentType || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const technologies = components.reduce((acc, comp) => {
      if (comp.technology) {
        acc[comp.technology] = (acc[comp.technology] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return { types, technologies };
  }

  private analyzeRelationshipPatterns(relationships: Relationship[]): any {
    const types = relationships.reduce((acc, rel) => {
      const type = rel.relationshipType || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { types, total: relationships.length };
  }

  private getC4Recommendations(elements: any, applicationTypes: any, componentTypes: any): string[] {
    const recommendations = [];

    if (elements.actors > 0 && elements.applications > 0) {
      recommendations.push('Start with System Context view to show high-level interactions');
    }

    if (elements.components > 3) {
      recommendations.push('Use Container view to show application internal structure');
    }

    if (applicationTypes.lifecycles?.RETIRE > 0) {
      recommendations.push('Consider migration strategy for retired applications');
    }

    if (componentTypes.types?.DATABASE > 2) {
      recommendations.push('Review data architecture - multiple databases detected');
    }

    if (elements.applications > 10) {
      recommendations.push('Consider breaking down into multiple System Context diagrams');
    }

    return recommendations;
  }

  private calculateDiagramComplexity(elements: number, relationships: number): 'low' | 'medium' | 'high' {
    const complexity = elements + (relationships * 2);
    if (complexity < 15) return 'low';
    if (complexity < 50) return 'medium';
    return 'high';
  }

  private getRecommendedViews(elements: any): string[] {
    const views = [];

    if (elements.actors > 0 && elements.applications > 0) {
      views.push('c4-context');
    }

    if (elements.components > 0) {
      views.push('c4-container', 'component');
    }

    if (elements.nodes > 0 || elements.software > 0) {
      views.push('deployment');
    }

    if (elements.actors > 1 && elements.applications > 1) {
      views.push('sequence');
    }

    return views;
  }
}
