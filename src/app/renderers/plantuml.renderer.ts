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
    let plantuml = '@startuml\\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml\\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml\\n\\n';
    
    plantuml += `title ${architecture.name} - ${this.formatViewType(viewType)}\\n\\n`;

    // Add persons (business actors)
    if (architecture.businessLayer?.actors) {
      architecture.businessLayer.actors.forEach(actor => {
        if (actor.uid && actor.name) {
          const id = this.sanitizeId(actor.uid);
          const external = actor.actorType === 'EXTERNAL' ? '_Ext' : '';
          plantuml += `Person${external}(${id}, "${actor.name}", "${actor.description || ''}")\\n`;
        }
      });
    }

    if (viewType === 'system-context') {
      // Add systems (applications)
      if (architecture.applicationLayer?.applications) {
        architecture.applicationLayer.applications.forEach(app => {
          if (app.uid && app.name) {
            const id = this.sanitizeId(app.uid);
            plantuml += `System(${id}, "${app.name}", "${app.description || ''}")\\n`;
          }
        });
      }
    } else if (viewType === 'container') {
      // Add containers (application components)
      if (architecture.applicationLayer?.components) {
        architecture.applicationLayer.components.forEach(component => {
          if (component.uid && component.name) {
            const id = this.sanitizeId(component.uid);
            const type = component.componentType === 'DATABASE' ? 'Db' : '';
            plantuml += `Container${type}(${id}, "${component.name}", "${component.technology || 'Technology'}", "${component.description || ''}")\\n`;
          }
        });
      }
    } else if (viewType === 'component') {
      // Add components
      if (architecture.applicationLayer?.components) {
        architecture.applicationLayer.components.forEach(component => {
          if (component.uid && component.name) {
            const id = this.sanitizeId(component.uid);
            plantuml += `Component(${id}, "${component.name}", "${component.technology || 'Technology'}", "${component.description || ''}")\\n`;
          }
        });
      }
    }

    // Add external systems (technology nodes)
    if (architecture.technologyLayer?.nodes) {
      architecture.technologyLayer.nodes.forEach(node => {
        if (node.uid && node.name) {
          const id = this.sanitizeId(node.uid);
          plantuml += `System_Ext(${id}, "${node.name}", "${node.description || ''}")\\n`;
        }
      });
    }

    // Add relationships
    if (architecture.relationships) {
      plantuml += '\\n';
      architecture.relationships.forEach(rel => {
        if (rel.source && rel.target) {
          const sourceId = this.sanitizeId(this.extractElementId(rel.source));
          const targetId = this.sanitizeId(this.extractElementId(rel.target));
          const direction = this.getRelationshipDirection(rel.relationshipType);
          plantuml += `Rel${direction}(${sourceId}, ${targetId}, "${rel.description || ''}", "${this.getRelationshipTech(rel)}")\\n`;
        }
      });
    }

    plantuml += '\\n@enduml';
    return plantuml;
  }

  private generateDeploymentDiagram(architecture: ArchitectureModel): string {
    let plantuml = '@startuml\\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml\\n\\n';
    
    plantuml += `title ${architecture.name} - Deployment View\\n\\n`;

    // Add deployment nodes
    if (architecture.technologyLayer?.nodes) {
      architecture.technologyLayer.nodes.forEach(node => {
        if (node.uid && node.name) {
          const id = this.sanitizeId(node.uid);
          plantuml += `Deployment_Node(${id}, "${node.name}", "${node.operatingSystem || 'OS'}", "${node.description || ''}") {\\n`;
          
          // Add software deployed on this node
          if (architecture.technologyLayer?.systemSoftware) {
            architecture.technologyLayer.systemSoftware
              .filter(sw => sw.uid && sw.name)
              .forEach(software => {
                const swId = this.sanitizeId(software.uid!);
                plantuml += `  Container(${swId}, "${software.name}", "${software.vendor || 'Vendor'} ${software.version || ''}", "${software.description || ''}")\\n`;
              });
          }
          
          plantuml += '}\\n\\n';
        }
      });
    }

    // Add relationships
    if (architecture.relationships) {
      architecture.relationships.forEach(rel => {
        if (rel.source && rel.target) {
          const sourceId = this.sanitizeId(this.extractElementId(rel.source));
          const targetId = this.sanitizeId(this.extractElementId(rel.target));
          plantuml += `Rel(${sourceId}, ${targetId}, "${rel.description || ''}", "${this.getRelationshipTech(rel)}")\\n`;
        }
      });
    }

    plantuml += '\\n@enduml';
    return plantuml;
  }

  private generateComponentDiagram(architecture: ArchitectureModel): string {
    let plantuml = '@startuml\\n';
    plantuml += `title ${architecture.name} - Component View\\n\\n`;

    // Add packages for different layers
    plantuml += 'package "Business Layer" {\\n';
    if (architecture.businessLayer?.actors) {
      architecture.businessLayer.actors.forEach(actor => {
        if (actor.uid && actor.name) {
          const id = this.sanitizeId(actor.uid);
          plantuml += `  actor ${id} as "${actor.name}"\\n`;
        }
      });
    }
    plantuml += '}\\n\\n';

    plantuml += 'package "Application Layer" {\\n';
    if (architecture.applicationLayer?.applications) {
      architecture.applicationLayer.applications.forEach(app => {
        if (app.uid && app.name) {
          const id = this.sanitizeId(app.uid);
          plantuml += `  component ${id} as "${app.name}"\\n`;
        }
      });
    }

    if (architecture.applicationLayer?.components) {
      architecture.applicationLayer.components.forEach(component => {
        if (component.uid && component.name) {
          const id = this.sanitizeId(component.uid);
          const stereotype = component.componentType === 'DATABASE' ? ' <<database>>' : '';
          plantuml += `  component ${id} as "${component.name}"${stereotype}\\n`;
        }
      });
    }
    plantuml += '}\\n\\n';

    plantuml += 'package "Technology Layer" {\\n';
    if (architecture.technologyLayer?.nodes) {
      architecture.technologyLayer.nodes.forEach(node => {
        if (node.uid && node.name) {
          const id = this.sanitizeId(node.uid);
          plantuml += `  node ${id} as "${node.name}"\\n`;
        }
      });
    }
    plantuml += '}\\n\\n';

    // Add relationships
    if (architecture.relationships) {
      architecture.relationships.forEach(rel => {
        if (rel.source && rel.target) {
          const sourceId = this.sanitizeId(this.extractElementId(rel.source));
          const targetId = this.sanitizeId(this.extractElementId(rel.target));
          const arrow = this.getUMLArrow(rel.relationshipType);
          plantuml += `${sourceId} ${arrow} ${targetId} : ${rel.description || ''}\\n`;
        }
      });
    }

    plantuml += '\\n@enduml';
    return plantuml;
  }

  private generateSequenceDiagram(architecture: ArchitectureModel): string {
    let plantuml = '@startuml\\n';
    plantuml += `title ${architecture.name} - Sequence View\\n\\n`;

    // Add participants
    const participants = new Set<string>();

    if (architecture.businessLayer?.actors) {
      architecture.businessLayer.actors.forEach(actor => {
        if (actor.uid && actor.name) {
          const id = this.sanitizeId(actor.uid);
          participants.add(id);
          plantuml += `participant "${actor.name}" as ${id}\\n`;
        }
      });
    }

    if (architecture.applicationLayer?.applications) {
      architecture.applicationLayer.applications.forEach(app => {
        if (app.uid && app.name) {
          const id = this.sanitizeId(app.uid);
          participants.add(id);
          plantuml += `participant "${app.name}" as ${id}\\n`;
        }
      });
    }

    if (architecture.applicationLayer?.components) {
      architecture.applicationLayer.components.forEach(component => {
        if (component.uid && component.name) {
          const id = this.sanitizeId(component.uid);
          participants.add(id);
          plantuml += `participant "${component.name}" as ${id}\\n`;
        }
      });
    }

    plantuml += '\\n';

    // Add interactions based on relationships
    if (architecture.relationships) {
      let step = 1;
      architecture.relationships.forEach(rel => {
        if (rel.source && rel.target) {
          const sourceId = this.sanitizeId(this.extractElementId(rel.source));
          const targetId = this.sanitizeId(this.extractElementId(rel.target));
          
          if (participants.has(sourceId) && participants.has(targetId)) {
            const arrow = rel.relationshipType === 'FLOW' ? '->>' : '->';
            plantuml += `${sourceId} ${arrow} ${targetId} : ${step}. ${rel.description || 'interaction'}\\n`;
            step++;
          }
        }
      });
    }

    plantuml += '\\n@enduml';
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
    if (rel.properties?.technology) return rel.properties.technology;
    if (rel.flowType) return rel.flowType;
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

  // Public method for analyzing model
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

    return {
      elements,
      relationships,
      totalElements,
      diagramComplexity: this.calculateDiagramComplexity(totalElements, relationships),
      recommendedViews: this.getRecommendedViews(elements)
    };
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