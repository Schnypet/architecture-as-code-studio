import { Injectable } from '@angular/core';
import {
  Architecture,
  BusinessLayer,
  ApplicationLayer,
  TechnologyLayer,
  BusinessActor,
  ApplicationComponent,
  Application,
  TechnologyNode,
  BusinessService,
  ApplicationService,
  BusinessDomain,
  BusinessCapability,
  BusinessProcess,
  ApplicationInterface,
  TechnologyService,
  TechnologyInterface,
  SystemSoftware,
  Artifact,
  Relationship
} from '../../generated/api';

export interface C4Element {
  id: string;
  name: string;
  description: string;
  type: 'person' | 'system' | 'container' | 'component' | 'service' | 'node' | 'infrastructure';
  technology?: string;
  tags?: string[];
  isDatabase?: boolean;
  nodeType?: string;
  serviceLevel?: string;
  availability?: string;
  location?: string;
  capacity?: string;
}

export interface C4Relationship {
  sourceId: string;
  targetId: string;
  description: string;
  relationshipType: string;
  flowType?: string;
  technology?: string;
}

export interface StructurizrContext {
  name: string;
  description: string;
  people: C4Element[];
  systems: C4Element[];
  containers: C4Element[];
  components: C4Element[];
  services: C4Element[];
  infrastructure: C4Element[];
  relationships: C4Relationship[];
}

@Injectable({
  providedIn: 'root'
})
export class StructurizrMappingService {

  createWorkspace(architecture: Architecture): StructurizrContext {
    return {
      name: architecture.name || 'Architecture Model',
      description: architecture.description || 'Generated from Architecture as Code Engine',
      people: [],
      systems: [],
      containers: [],
      components: [],
      services: [],
      infrastructure: [],
      relationships: []
    };
  }

  mapArchitectureToStructurizr(architecture: Architecture): StructurizrContext {
    const context = this.createWorkspace(architecture);

    // Map business actors to people
    if (architecture.businessLayer?.actors) {
      context.people = this.mapBusinessActorsToPeople(architecture.businessLayer.actors);
      console.log('Mapped people:', context.people.length);
    }

    // Map applications to software systems
    if (architecture.applicationLayer?.applications) {
      context.systems = this.mapApplicationsToSystems(architecture.applicationLayer.applications);
      console.log('Mapped systems:', context.systems);
    }

    // Map application components to containers AND components based on their type
    if (architecture.applicationLayer?.components) {
      const mappedComponents = this.mapApplicationComponents(architecture.applicationLayer.components);
      context.containers = mappedComponents.containers;
      context.components = mappedComponents.components;
      console.log('Mapped containers:', context.containers.length);
      console.log('Mapped components:', context.components.length);
    }

    // Map business and application services
    context.services = [
      ...this.mapBusinessServices(architecture.businessLayer?.services || []),
      ...this.mapApplicationServices(architecture.applicationLayer?.services || [])
    ];
    console.log('Mapped services:', context.services.length);

    // Map technology layer to infrastructure
    context.infrastructure = [
      ...this.mapTechnologyNodes(architecture.technologyLayer?.nodes || []),
      ...this.mapSystemSoftware(architecture.technologyLayer?.systemSoftware || []),
      ...this.mapTechnologyServices(architecture.technologyLayer?.services || [])
    ];
    console.log('Mapped infrastructure:', context.infrastructure.length);

    // Map relationships (including actor-to-system relationships)
    if (architecture.relationships) {
      context.relationships = this.mapRelationships(architecture.relationships);
      console.log('Mapped relationships:', context.relationships.length);
    }

    // Add inferred relationships between actors and systems
    context.relationships = [...context.relationships, ...this.inferActorSystemRelationships(context)];
    console.log('Total relationships after inference:', context.relationships.length);

    // Debug: Log the complete context
    console.log('Complete StructurizrContext:', {
      name: context.name,
      people: context.people.length,
      systems: context.systems.length,
      containers: context.containers.length,
      services: context.services.length,
      infrastructure: context.infrastructure.length,
      relationships: context.relationships.length
    });

    return context;
  }

  private mapBusinessActorsToPeople(actors: BusinessActor[]): C4Element[] {
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

  private mapApplicationsToSystems(applications: Application[]): C4Element[] {
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

  private mapApplicationComponents(components: ApplicationComponent[]): { containers: C4Element[], components: C4Element[] } {
    const containers: C4Element[] = [];
    const componentElements: C4Element[] = [];
    
    components
      .filter(component => component.uid && component.name)
      .forEach(component => {
        const isDatabase = component.componentType === 'DATABASE';
        
        // Map high-level application components as containers
        // Map detailed/internal components as components
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
          // Map as component for finer-grained elements
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

  private mapRelationships(relationships: Relationship[]): C4Relationship[] {
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

  private extractElementId(element: any): string {
    // Extract UID from the element object
    if (typeof element === 'object' && element.uid) {
      return element.uid;
    }
    // Fallback if it's already a string
    return String(element);
  }

  generateC4PlantUML(context: StructurizrContext, viewType: 'system-context' | 'container' | 'component' = 'system-context'): string {
    let plantuml = '@startuml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Deployment.puml\n\n';
    plantuml += `title ${context.name}\n\n`;

    // Add people
    context.people.forEach(person => {
      plantuml += `Person(${this.sanitizeId(person.id)}, "${person.name}", "${person.description}")\n`;
    });

    // Add systems
    context.systems.forEach(system => {
      plantuml += `System(${this.sanitizeId(system.id)}, "${system.name}", "${system.description}")\n`;
    });

    if (viewType === 'container' || viewType === 'component') {
      // Add containers (including databases)
      context.containers.forEach(container => {
        if (container.isDatabase) {
          // Use ContainerDb for database containers
          plantuml += `ContainerDb(${this.sanitizeId(container.id)}, "${container.name}", "${container.technology || 'Database'}", "${container.description}")\n`;
        } else {
          // Use regular Container for non-database containers
          plantuml += `Container(${this.sanitizeId(container.id)}, "${container.name}", "${container.technology || 'Technology'}", "${container.description}")\n`;
        }
      });

      // Add infrastructure elements - als System_Ext für bessere Kompatibilität
      context.infrastructure.forEach(infra => {
        if (infra.nodeType === 'SERVER' || infra.nodeType === 'CLOUD') {
          // Use System_Ext for infrastructure in container view for better compatibility
          plantuml += `System_Ext(${this.sanitizeId(infra.id)}, "${infra.name}", "${infra.description}")\n`;
        }
      });
    }

    if (viewType === 'component') {
      // Add actual components
      context.components.forEach(component => {
        plantuml += `Component(${this.sanitizeId(component.id)}, "${component.name}", "${component.technology || 'Component'}", "${component.description}")\n`;
      });

      // Add services as components
      context.services.forEach(service => {
        plantuml += `Component(${this.sanitizeId(service.id)}, "${service.name}", "Service", "${service.description}")\n`;
      });

      // Add infrastructure elements as components
      context.infrastructure.forEach(infra => {
        if (infra.nodeType !== 'SERVER' && infra.nodeType !== 'CLOUD') {
          plantuml += `Component(${this.sanitizeId(infra.id)}, "${infra.name}", "${infra.technology || 'Infrastructure'}", "${infra.description}")\n`;
        }
      });
    }

    // Add relationships
    plantuml += '\n';
    context.relationships.forEach(rel => {
      const sourceId = this.sanitizeId(rel.sourceId);
      const targetId = this.sanitizeId(rel.targetId);
      const label = rel.description;

      // Use different relationship styles based on type
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

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private mapBusinessServices(services: BusinessService[]): C4Element[] {
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

  private mapApplicationServices(services: ApplicationService[]): C4Element[] {
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

  private mapTechnologyNodes(nodes: TechnologyNode[]): C4Element[] {
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

  private mapSystemSoftware(systemSoftware: SystemSoftware[]): C4Element[] {
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

  private mapTechnologyServices(services: TechnologyService[]): C4Element[] {
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

  private inferActorSystemRelationships(context: StructurizrContext): C4Relationship[] {
    const inferredRelationships: C4Relationship[] = [];

    // Create basic relationships between actors and systems if none exist
    if (context.relationships.length === 0 && context.people.length > 0 && context.systems.length > 0) {
      context.people.forEach(person => {
        context.systems.forEach(system => {
          inferredRelationships.push({
            sourceId: person.id,
            targetId: system.id,
            description: `Uses`,
            relationshipType: 'SERVING',
            technology: 'HTTPS'
          });
        });
      });
    }

    return inferredRelationships;
  }

  // Helper method to analyze the data structure
  analyzeArchitectureData(architecture: Architecture): any {
    const analysis = {
      businessLayer: {
        actorCount: architecture.businessLayer?.actors?.length || 0,
        domainCount: architecture.businessLayer?.domains?.length || 0,
        processCount: architecture.businessLayer?.processes?.length || 0,
        serviceCount: architecture.businessLayer?.services?.length || 0,
        capabilityCount: architecture.businessLayer?.capabilities?.length || 0
      },
      applicationLayer: {
        applicationCount: architecture.applicationLayer?.applications?.length || 0,
        componentCount: architecture.applicationLayer?.components?.length || 0,
        serviceCount: architecture.applicationLayer?.services?.length || 0,
        interfaceCount: architecture.applicationLayer?.interfaces?.length || 0
      },
      technologyLayer: {
        nodeCount: architecture.technologyLayer?.nodes?.length || 0,
        serviceCount: architecture.technologyLayer?.services?.length || 0,
        artifactCount: architecture.technologyLayer?.artifacts?.length || 0,
        interfaceCount: architecture.technologyLayer?.interfaces?.length || 0,
        systemSoftwareCount: architecture.technologyLayer?.systemSoftware?.length || 0
      },
      relationshipCount: architecture.relationships?.length || 0
    };

    console.log('Architecture Analysis:', analysis);
    return analysis;
  }
}
