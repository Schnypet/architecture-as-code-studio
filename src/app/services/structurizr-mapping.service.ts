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
  Relationship
} from '../../generated/api';

export interface C4Element {
  id: string;
  name: string;
  description: string;
  type: 'person' | 'system' | 'container' | 'component';
  technology?: string;
  tags?: string[];
  isDatabase?: boolean;
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

    // Map application components to containers
    if (architecture.applicationLayer?.components) {
      context.containers = this.mapComponentsToContainers(architecture.applicationLayer.components);
      console.log('Mapped containers:', context.containers.length);
    }

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

  private mapComponentsToContainers(components: ApplicationComponent[]): C4Element[] {
    return components
      .filter(component => component.uid && component.name)
      .map(component => {
        const isDatabase = component.componentType === 'DATABASE';
        return {
          id: component.uid!,
          name: component.name!,
          description: component.description || '',
          type: 'container' as const,
          technology: component.technology || 'Unknown Technology',
          isDatabase,
          tags: [
            ...(component.componentType ? [component.componentType.toLowerCase()] : []),
            // Add system association tag for proper container-system mapping
            'container',
            ...(isDatabase ? ['database'] : [])
          ]
        };
      });
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
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\n\n';
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
