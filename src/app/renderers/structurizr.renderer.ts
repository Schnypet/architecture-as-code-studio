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

// Internal interfaces for Structurizr rendering
interface StructurizrElement {
  id: string;
  name: string;
  description: string;
  type: 'person' | 'system' | 'container' | 'component' | 'service' | 'infrastructure';
  technology?: string;
  tags?: string[];
  isDatabase?: boolean;
  nodeType?: string;
  serviceLevel?: string;
  availability?: string;
  location?: string;
  capacity?: string;
}

interface StructurizrRelationship {
  sourceId: string;
  targetId: string;
  description: string;
  relationshipType: string;
  flowType?: string;
  technology?: string;
}

interface StructurizrModel {
  name: string;
  description: string;
  people: StructurizrElement[];
  systems: StructurizrElement[];
  containers: StructurizrElement[];
  components: StructurizrElement[];
  services: StructurizrElement[];
  infrastructure: StructurizrElement[];
  relationships: StructurizrRelationship[];
}

@Injectable({
  providedIn: 'root'
})
export class StructurizrRenderer extends AbstractRenderer<DiagramOutput> {
  readonly name = 'structurizr';
  readonly description = 'Structurizr DSL and PlantUML C4 diagram renderer';
  readonly supportedFormats = ['dsl', 'plantuml'] as const;
  readonly version = '1.0.0';

  render(architecture: ArchitectureModel, options?: RenderOptions): DiagramOutput {
    const startTime = Date.now();
    this.logRenderingInfo(architecture, options?.format || 'dsl');

    // Convert architecture to internal model
    const structurizrModel = this.mapToStructurizrModel(architecture);

    // Generate output based on format
    const format = options?.format || 'dsl';
    let content: string;

    switch (format) {
      case 'plantuml':
        content = this.generatePlantUML(structurizrModel, options?.viewType || 'system-context');
        break;
      case 'dsl':
      default:
        content = this.generateStructurizrDSL(structurizrModel);
        break;
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
      exportFormats: ['dsl', 'plantuml'],
      layoutAlgorithms: ['auto'],
      filteringSupport: true,
      relationshipTypes: ['FLOW', 'SERVING', 'ACCESS', 'TRIGGERING', 'ASSOCIATION']
    };
  }

  getMetadata(): RendererMetadata {
    return {
      author: 'Architecture as Code Studio',
      license: 'MIT',
      homepage: 'https://structurizr.com',
      repository: 'https://github.com/structurizr/dsl',
      tags: ['structurizr', 'c4', 'dsl', 'plantuml'],
      dependencies: ['plantuml-encoder']
    };
  }

  private mapToStructurizrModel(architecture: ArchitectureModel): StructurizrModel {
    const model: StructurizrModel = {
      name: architecture.name,
      description: architecture.description || '',
      people: [],
      systems: [],
      containers: [],
      components: [],
      services: [],
      infrastructure: [],
      relationships: []
    };

    // Map business actors to people
    if (architecture.businessLayer?.actors) {
      model.people = this.mapBusinessActorsToPeople(architecture.businessLayer.actors);
    }

    // Map applications to systems
    if (architecture.applicationLayer?.applications) {
      model.systems = this.mapApplicationsToSystems(architecture.applicationLayer.applications);
    }

    // Map application components to containers and components
    if (architecture.applicationLayer?.components) {
      const mappedComponents = this.mapApplicationComponents(architecture.applicationLayer.components);
      model.containers = mappedComponents.containers;
      model.components = mappedComponents.components;
    }

    // Map services
    model.services = [
      ...this.mapBusinessServices(architecture.businessLayer?.services || []),
      ...this.mapApplicationServices(architecture.applicationLayer?.services || [])
    ];

    // Map technology infrastructure
    model.infrastructure = [
      ...this.mapTechnologyNodes(architecture.technologyLayer?.nodes || []),
      ...this.mapSystemSoftware(architecture.technologyLayer?.systemSoftware || []),
      ...this.mapTechnologyServices(architecture.technologyLayer?.services || [])
    ];

    // Map relationships
    if (architecture.relationships) {
      model.relationships = this.mapRelationships(architecture.relationships);
    }

    // Add inferred relationships if none exist
    if (model.relationships.length === 0) {
      model.relationships = this.inferActorSystemRelationships(model);
    }

    return model;
  }

  private mapBusinessActorsToPeople(actors: BusinessActor[]): StructurizrElement[] {
    return actors
      .filter(actor => actor.uid && actor.name)
      .map(actor => ({
        id: actor.uid!,
        name: actor.name!,
        description: actor.description || '',
        type: 'person' as const,
        tags: actor.actorType ? [actor.actorType.toLowerCase()] : []
      }));
  }

  private mapApplicationsToSystems(applications: Application[]): StructurizrElement[] {
    return applications
      .filter(app => app.uid && app.name)
      .map(app => ({
        id: app.uid!,
        name: app.name!,
        description: app.description || '',
        type: 'system' as const,
        tags: [
          ...(app.stereoType ? [app.stereoType.toLowerCase().replace('_', '-')] : []),
          ...(app.lifecycle ? [`lifecycle-${app.lifecycle.toLowerCase()}`] : [])
        ]
      }));
  }

  private mapApplicationComponents(components: ApplicationComponent[]): { containers: StructurizrElement[], components: StructurizrElement[] } {
    const containers: StructurizrElement[] = [];
    const componentElements: StructurizrElement[] = [];
    
    components
      .filter(component => component.uid && component.name)
      .forEach(component => {
        const isDatabase = component.componentType === 'DATABASE';
        const isContainer = ['BACKEND', 'FRONTEND', 'DATABASE', 'API_GATEWAY'].includes(component.componentType || '');
        
        if (isContainer) {
          containers.push({
            id: component.uid!,
            name: component.name!,
            description: component.description || '',
            type: 'container' as const,
            technology: component.technology || 'Unknown Technology',
            isDatabase,
            tags: [
              ...(component.componentType ? [component.componentType.toLowerCase()] : []),
              'container',
              ...(isDatabase ? ['database'] : [])
            ]
          });
        } else {
          componentElements.push({
            id: component.uid!,
            name: component.name!,
            description: component.description || '',
            type: 'component' as const,
            technology: component.technology || 'Unknown Technology',
            tags: [
              ...(component.componentType ? [component.componentType.toLowerCase()] : []),
              'component'
            ]
          });
        }
      });
    
    return { containers, components: componentElements };
  }

  private mapBusinessServices(services: BusinessService[]): StructurizrElement[] {
    return services
      .filter(service => service.uid && service.name)
      .map(service => ({
        id: service.uid!,
        name: service.name!,
        description: service.description || '',
        type: 'service' as const,
        serviceLevel: service.serviceLevel,
        availability: service.availability,
        tags: ['business-service']
      }));
  }

  private mapApplicationServices(services: ApplicationService[]): StructurizrElement[] {
    return services
      .filter(service => service.uid && service.name)
      .map(service => ({
        id: service.uid!,
        name: service.name!,
        description: service.description || '',
        type: 'service' as const,
        tags: ['application-service']
      }));
  }

  private mapTechnologyNodes(nodes: TechnologyNode[]): StructurizrElement[] {
    return nodes
      .filter(node => node.uid && node.name)
      .map(node => ({
        id: node.uid!,
        name: node.name!,
        description: node.description || '',
        type: 'infrastructure' as const,
        nodeType: node.nodeType,
        location: node.location,
        capacity: node.capacity,
        technology: node.operatingSystem,
        tags: [
          'technology-node',
          ...(node.nodeType ? [node.nodeType.toLowerCase()] : [])
        ]
      }));
  }

  private mapSystemSoftware(systemSoftware: SystemSoftware[]): StructurizrElement[] {
    return systemSoftware
      .filter(software => software.uid && software.name)
      .map(software => ({
        id: software.uid!,
        name: software.name!,
        description: software.description || '',
        type: 'infrastructure' as const,
        technology: `${software.vendor || 'Unknown'} ${software.version || ''}`.trim(),
        tags: [
          'system-software',
          ...(software.softwareType ? [software.softwareType.toLowerCase()] : [])
        ]
      }));
  }

  private mapTechnologyServices(services: TechnologyService[]): StructurizrElement[] {
    return services
      .filter(service => service.uid && service.name)
      .map(service => ({
        id: service.uid!,
        name: service.name!,
        description: service.description || '',
        type: 'service' as const,
        technology: service.provider,
        tags: [
          'technology-service',
          ...(service.serviceCategory ? [service.serviceCategory.toLowerCase()] : [])
        ]
      }));
  }

  private mapRelationships(relationships: Relationship[]): StructurizrRelationship[] {
    return relationships
      .filter(rel => rel.source && rel.target)
      .map(rel => ({
        sourceId: this.extractElementId(rel.source),
        targetId: this.extractElementId(rel.target),
        description: rel.description || '',
        relationshipType: rel.relationshipType || 'ASSOCIATION',
        flowType: rel.flowType,
        technology: rel.properties?.['technology'] || ''
      }));
  }

  private inferActorSystemRelationships(model: StructurizrModel): StructurizrRelationship[] {
    const inferredRelationships: StructurizrRelationship[] = [];

    if (model.people.length > 0 && model.systems.length > 0) {
      model.people.forEach(person => {
        model.systems.forEach(system => {
          inferredRelationships.push({
            sourceId: person.id,
            targetId: system.id,
            description: 'Uses',
            relationshipType: 'SERVING',
            technology: 'HTTPS'
          });
        });
      });
    }

    return inferredRelationships;
  }

  private generateStructurizrDSL(model: StructurizrModel): string {
    let dsl = `workspace "${model.name}" "${model.description}" {\n\n`;
    dsl += '    model {\n';

    // Add people
    model.people.forEach(person => {
      const personId = this.sanitizeId(person.id);
      dsl += `        ${personId} = person "${person.name}"`;
      if (person.description) {
        dsl += ` "${person.description}"`;
      }
      dsl += '\n';
    });

    if (model.people.length > 0 && model.systems.length > 0) {
      dsl += '\n';
    }

    // Add software systems with containers
    model.systems.forEach((system, systemIndex) => {
      const systemId = this.sanitizeId(system.id);
      dsl += `        ${systemId} = softwareSystem "${system.name}"`;
      if (system.description) {
        dsl += ` "${system.description}"`;
      }
      dsl += ' {\n';

      // Distribute containers across systems
      const containersPerSystem = Math.ceil(model.containers.length / Math.max(model.systems.length, 1));
      const startIndex = systemIndex * containersPerSystem;
      const systemContainers = model.containers.slice(startIndex, startIndex + containersPerSystem);

      systemContainers.forEach(container => {
        const containerId = this.sanitizeId(container.id);
        dsl += `            ${containerId} = container "${container.name}"`;
        if (container.description) {
          dsl += ` "${container.description}"`;
        }
        if (container.technology) {
          dsl += ` "${container.technology}"`;
        }
        if (container.isDatabase) {
          dsl += ' "Database"';
        }
        dsl += ' {\n';

        // Add components within containers
        const containerComponents = systemIndex === 0 ? model.components : [];
        containerComponents.forEach(component => {
          const componentId = this.sanitizeId(component.id);
          dsl += `                ${componentId} = component "${component.name}"`;
          if (component.description) {
            dsl += ` "${component.description}"`;
          }
          if (component.technology) {
            dsl += ` "${component.technology}"`;
          }
          dsl += '\n';
        });

        // Add services as components
        const containerServices = systemIndex === 0 ? model.services : [];
        containerServices.forEach(service => {
          const serviceId = this.sanitizeId(service.id);
          dsl += `                ${serviceId} = component "${service.name}"`;
          if (service.description) {
            dsl += ` "${service.description}"`;
          }
          dsl += ' "Service"\n';
        });

        dsl += '            }\n';
      });

      if (systemContainers.length === 0) {
        const placeholderId = this.sanitizeId(`${system.id}_container`);
        dsl += `            ${placeholderId} = container "${system.name} Core" "${system.description || 'Main component'}" "Application"\n`;
      }

      dsl += '        }\n';
    });

    // Add infrastructure as external systems
    if (model.infrastructure.length > 0) {
      dsl += '\n        # Infrastructure\n';
      model.infrastructure.forEach(infra => {
        const infraId = this.sanitizeId(infra.id);
        dsl += `        ${infraId} = softwareSystem "${infra.name}"`;
        if (infra.description) {
          dsl += ` "${infra.description}"`;
        }
        dsl += ' {\n';
        dsl += '            tags "Infrastructure"';
        if (infra.nodeType) {
          dsl += `,${infra.nodeType}`;
        }
        dsl += '\n        }\n';
      });
    }

    // Add relationships
    if (model.relationships.length > 0) {
      dsl += '\n        # Relationships\n';
      model.relationships.forEach(rel => {
        const sourceId = this.sanitizeId(rel.sourceId);
        const targetId = this.sanitizeId(rel.targetId);
        dsl += `        ${sourceId} -> ${targetId} "${rel.description}"`;
        if (rel.technology && rel.technology !== '') {
          dsl += ` "${rel.technology}"`;
        }
        dsl += '\n';
      });
    }

    dsl += '\n    }\n\n';

    // Add views
    dsl += '    views {\n';

    if (model.systems.length > 0) {
      const mainSystemId = this.sanitizeId(model.systems[0].id);
      dsl += `        systemContext ${mainSystemId} "SystemContext" {\n`;
      dsl += '            include *\n';
      dsl += '            autoLayout\n';
      dsl += '        }\n\n';

      if (model.containers.length > 0) {
        dsl += `        container ${mainSystemId} "Containers" {\n`;
        dsl += '            include *\n';
        dsl += '            autoLayout\n';
        dsl += '        }\n\n';

        if (model.components.length > 0) {
          const mainContainerId = this.sanitizeId(model.containers[0].id);
          dsl += `        component ${mainContainerId} "Components" {\n`;
          dsl += '            include *\n';
          dsl += '            autoLayout\n';
          dsl += '        }\n\n';
        }
      }
    }

    dsl += '        theme default\n';
    dsl += '    }\n';
    dsl += '}\n';

    return dsl;
  }

  private generatePlantUML(model: StructurizrModel, viewType: ViewType): string {
    let plantuml = '@startuml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml\n\n';
    plantuml += `title ${model.name}\n\n`;

    // Add people
    model.people.forEach(person => {
      plantuml += `Person(${this.sanitizeId(person.id)}, "${person.name}", "${person.description}")\n`;
    });

    // Add systems
    model.systems.forEach(system => {
      plantuml += `System(${this.sanitizeId(system.id)}, "${system.name}", "${system.description}")\n`;
    });

    if (viewType === 'container' || viewType === 'component') {
      // Add containers
      model.containers.forEach(container => {
        if (container.isDatabase) {
          plantuml += `ContainerDb(${this.sanitizeId(container.id)}, "${container.name}", "${container.technology || 'Database'}", "${container.description}")\n`;
        } else {
          plantuml += `Container(${this.sanitizeId(container.id)}, "${container.name}", "${container.technology || 'Technology'}", "${container.description}")\n`;
        }
      });

      // Add infrastructure as external systems
      model.infrastructure.forEach(infra => {
        if (infra.nodeType === 'SERVER' || infra.nodeType === 'CLOUD') {
          plantuml += `System_Ext(${this.sanitizeId(infra.id)}, "${infra.name}", "${infra.description}")\n`;
        }
      });
    }

    if (viewType === 'component') {
      // Add components
      model.components.forEach(component => {
        plantuml += `Component(${this.sanitizeId(component.id)}, "${component.name}", "${component.technology || 'Component'}", "${component.description}")\n`;
      });

      // Add services as components
      model.services.forEach(service => {
        plantuml += `Component(${this.sanitizeId(service.id)}, "${service.name}", "Service", "${service.description}")\n`;
      });

      // Add remaining infrastructure as components
      model.infrastructure.forEach(infra => {
        if (infra.nodeType !== 'SERVER' && infra.nodeType !== 'CLOUD') {
          plantuml += `Component(${this.sanitizeId(infra.id)}, "${infra.name}", "${infra.technology || 'Infrastructure'}", "${infra.description}")\n`;
        }
      });
    }

    // Add relationships
    plantuml += '\n';
    model.relationships.forEach(rel => {
      const sourceId = this.sanitizeId(rel.sourceId);
      const targetId = this.sanitizeId(rel.targetId);
      const label = rel.description;

      switch (rel.relationshipType) {
        case 'FLOW':
          plantuml += `Rel(${sourceId}, ${targetId}, "${label}", "${rel.flowType || 'flow'}")\n`;
          break;
        case 'SERVING':
          plantuml += `Rel(${sourceId}, ${targetId}, "${label}", "provides")\n`;
          break;
        case 'ACCESS':
          plantuml += `Rel(${sourceId}, ${targetId}, "${label}", "accesses")\n`;
          break;
        case 'TRIGGERING':
          plantuml += `Rel_D(${sourceId}, ${targetId}, "${label}", "triggers")\n`;
          break;
        default:
          plantuml += `Rel(${sourceId}, ${targetId}, "${label}")\n`;
      }
    });

    plantuml += '\n@enduml';
    return plantuml;
  }

  // Public method for analyzing model (for backward compatibility)
  analyzeModel(architecture: ArchitectureModel): any {
    const structurizrModel = this.mapToStructurizrModel(architecture);
    return {
      elements: {
        people: structurizrModel.people.length,
        systems: structurizrModel.systems.length,
        containers: structurizrModel.containers.length,
        components: structurizrModel.components.length,
        services: structurizrModel.services.length,
        infrastructure: structurizrModel.infrastructure.length
      },
      relationships: structurizrModel.relationships.length,
      totalElements: structurizrModel.people.length + 
                   structurizrModel.systems.length + 
                   structurizrModel.containers.length + 
                   structurizrModel.components.length +
                   structurizrModel.services.length +
                   structurizrModel.infrastructure.length
    };
  }
}