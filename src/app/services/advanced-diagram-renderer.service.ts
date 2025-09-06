import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DataSet, Network } from 'vis-network/standalone';
import { StructurizrContext, C4Element, C4Relationship } from './structurizr-mapping.service';

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  title: string;
  color?: {
    background: string;
    border: string;
  };
  shape: string;
  physics?: boolean;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  arrows: string;
  color: {
    color: string;
  };
  physics?: boolean;
}

export interface StructurizrWorkspace {
  name: string;
  description: string;
  model: {
    people: any[];
    softwareSystems: any[];
    relationships: any[];
  };
  views: {
    systemContextViews: any[];
    containerViews: any[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdvancedDiagramRendererService {

  /**
   * Generate interactive graph visualization data
   */
  generateGraphData(context: StructurizrContext): { nodes: DataSet<GraphNode>, edges: DataSet<GraphEdge> } {
    const nodes = new DataSet<GraphNode>();
    const edges = new DataSet<GraphEdge>();

    console.log('Generating graph data for context:', {
      people: context.people.length,
      systems: context.systems.length,
      containers: context.containers.length,
      relationships: context.relationships.length
    });

    // Add people as nodes
    context.people.forEach(person => {
      nodes.add({
        id: person.id,
        label: person.name,
        group: 'person',
        title: `Person: ${person.name}\n${person.description}`,
        color: {
          background: '#08427b',
          border: '#052d56'
        },
        shape: 'box',
        physics: true
      });
    });

    // Add systems as nodes
    context.systems.forEach(system => {
      nodes.add({
        id: system.id,
        label: system.name,
        group: 'system',
        title: `System: ${system.name}\n${system.description}`,
        color: {
          background: '#1168bd',
          border: '#0b4884'
        },
        shape: 'box',
        physics: true
      });
    });

    // Add containers as nodes (with special handling for databases)
    context.containers.forEach(container => {
      const isDatabase = container.isDatabase;
      nodes.add({
        id: container.id,
        label: container.name,
        group: isDatabase ? 'database' : 'container',
        title: `${isDatabase ? 'Database' : 'Container'}: ${container.name}\nTechnology: ${container.technology}\n${container.description}`,
        color: isDatabase ? {
          background: '#f39c12', // Orange for databases
          border: '#d68910'
        } : {
          background: '#438dd5',
          border: '#2e6da4'
        },
        shape: isDatabase ? 'database' : 'box',
        physics: true
      });
    });

    // Add components as nodes
    context.components.forEach(component => {
      nodes.add({
        id: component.id,
        label: component.name,
        group: 'component',
        title: `Component: ${component.name}\nTechnology: ${component.technology}\n${component.description}`,
        color: {
          background: '#85bbf0',
          border: '#5a9bd4'
        },
        shape: 'box',
        physics: true
      });
    });

    // Add relationships as edges
    context.relationships.forEach((rel, index) => {
      const edgeColor = this.getRelationshipColor(rel.relationshipType);
      edges.add({
        id: `rel_${index}`,
        from: rel.sourceId,
        to: rel.targetId,
        label: rel.description,
        arrows: 'to',
        color: {
          color: edgeColor
        },
        physics: true
      });
    });

    return { nodes, edges };
  }

  /**
   * Generate Structurizr DSL workspace
   */
  generateStructurizrWorkspace(context: StructurizrContext): Observable<StructurizrWorkspace> {
    const workspace: StructurizrWorkspace = {
      name: context.name,
      description: context.description,
      model: {
        people: context.people.map(person => ({
          id: person.id,
          name: person.name,
          description: person.description,
          location: 'External',
          tags: person.tags?.join(',') || ''
        })),
        softwareSystems: context.systems.map(system => ({
          id: system.id,
          name: system.name,
          description: system.description,
          location: 'Internal',
          tags: system.tags?.join(',') || '',
          containers: context.containers
            .filter(container => container.tags?.some(tag => tag.includes(system.id)))
            .map(container => ({
              id: container.id,
              name: container.name,
              description: container.description,
              technology: container.technology,
              tags: container.tags?.join(',') || '',
              isDatabase: container.isDatabase
            }))
        })),
        relationships: context.relationships.map(rel => ({
          sourceId: rel.sourceId,
          destinationId: rel.targetId,
          description: rel.description,
          technology: rel.technology || '',
          interactionStyle: this.mapRelationshipStyle(rel.relationshipType)
        }))
      },
      views: {
        systemContextViews: [{
          key: 'SystemContext',
          title: `${context.name} - System Context`,
          description: 'The system context diagram for the system.',
          softwareSystemId: context.systems[0]?.id || 'system1',
          paperSize: 'A4_Landscape',
          automaticLayout: {
            rankDirection: 'TopBottom',
            rankSeparation: 300,
            nodeSeparation: 300
          }
        }],
        containerViews: context.systems.map(system => ({
          key: `${system.id}_Containers`,
          title: `${system.name} - Containers`,
          description: `The container diagram for ${system.name}.`,
          softwareSystemId: system.id,
          paperSize: 'A4_Landscape',
          automaticLayout: {
            rankDirection: 'TopBottom',
            rankSeparation: 300,
            nodeSeparation: 300
          }
        }))
      }
    };

    return of(workspace);
  }

  /**
   * Generate Structurizr DSL text with proper syntax and complete relationships
   */
  generateStructurizrDSL(context: StructurizrContext): string {
    let dsl = `workspace "${context.name}" "${context.description}" {\n\n`;

    dsl += '    model {\n';

    // Add people (external users)
    context.people.forEach(person => {
      const personId = this.toDslId(person.id);
      dsl += `        ${personId} = person "${person.name}"`;
      if (person.description) {
        dsl += ` "${person.description}"`;
      }
      dsl += '\n';
    });

    if (context.people.length > 0 && context.systems.length > 0) {
      dsl += '\n';
    }

    // Add software systems with containers
    context.systems.forEach((system, systemIndex) => {
      // Processing system
      const systemId = this.toDslId(system.id);
      dsl += `        ${systemId} = softwareSystem "${system.name}"`;
      if (system.description) {
        dsl += ` "${system.description}"`;
      }
      dsl += ' {\n';

      // Add containers for this system
      // For demo purposes, distribute containers across systems
      const containersPerSystem = Math.ceil(context.containers.length / context.systems.length);
      const startIndex = systemIndex * containersPerSystem;
      const systemContainers = context.containers.slice(startIndex, startIndex + containersPerSystem);

      // System gets containers for distribution

      systemContainers.forEach(container => {
        const containerId = this.toDslId(container.id);
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
        dsl += '\n';
      });

      // If no containers for this system, add a placeholder
      if (systemContainers.length === 0) {
        const placeholderId = this.toDslId(`${system.id}_container`);
        dsl += `            ${placeholderId} = container "${system.name} Core" "${system.description || 'Main component'}" "Application"\n`;
      }

      dsl += '        }\n';
    });

    // Add all relationships - including system-to-system, person-to-system, and container relationships
    dsl += '\n        # Relationships\n';

    // Explicit relationships from API data
    context.relationships.forEach(rel => {
      const sourceId = this.toDslId(rel.sourceId);
      const targetId = this.toDslId(rel.targetId);
      const description = rel.description || 'Uses';

      dsl += `        ${sourceId} -> ${targetId} "${description}"`;
      if (rel.technology && rel.technology !== '') {
        dsl += ` "${rel.technology}"`;
      }
      dsl += '\n';
    });

    // Add missing system-to-system relationships if none exist
    if (context.systems.length > 1 && context.relationships.length === 0) {
      for (let i = 0; i < context.systems.length - 1; i++) {
        const sourceId = this.toDslId(context.systems[i].id);
        const targetId = this.toDslId(context.systems[i + 1].id);
        dsl += `        ${sourceId} -> ${targetId} "Communicates with"\n`;
      }
    }

    // Add person-to-system relationships if missing
    if (context.people.length > 0 && context.systems.length > 0) {
      const hasPersonSystemRelationships = context.relationships.some(rel =>
        context.people.some(p => p.id === rel.sourceId) &&
        context.systems.some(s => s.id === rel.targetId)
      );

      if (!hasPersonSystemRelationships) {
        context.people.forEach(person => {
          context.systems.slice(0, 1).forEach(system => { // Connect to first system
            const personId = this.toDslId(person.id);
            const systemId = this.toDslId(system.id);
            dsl += `        ${personId} -> ${systemId} "Uses"\n`;
          });
        });
      }
    }

    // Add container relationships within systems
    if (context.containers.length > 1) {
      for (let i = 0; i < Math.min(context.containers.length - 1, 2); i++) {
        const sourceId = this.toDslId(context.containers[i].id);
        const targetId = this.toDslId(context.containers[i + 1].id);
        dsl += `        ${sourceId} -> ${targetId} "Sends data to"\n`;
      }
    }

    dsl += '\n    }\n\n';

    // Add views
    dsl += '    views {\n';

    // System context view for the first system
    if (context.systems.length > 0) {
      const mainSystemId = this.toDslId(context.systems[0].id);
      dsl += `        systemContext ${mainSystemId} "SystemContext" {\n`;
      dsl += '            include *\n';
      dsl += '            autoLayout\n';
      dsl += '        }\n\n';

      // Container view for the first system
      if (context.containers.length > 0) {
        dsl += `        container ${mainSystemId} "Containers" {\n`;
        dsl += '            include *\n';
        dsl += '            autoLayout\n';
        dsl += '        }\n\n';
      }
    }

    // Add theme
    dsl += '        theme default\n';
    dsl += '    }\n';
    dsl += '}\n';

    return dsl;
  }

  /**
   * Create network visualization options
   */
  getNetworkOptions(): any {
    return {
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -1000,
          centralGravity: 0.01,
          springLength: 200,
          springConstant: 0.05
        }
      },
      interaction: {
        hover: true,
        navigationButtons: true,
        selectable: true,
        multiselect: true
      },
      layout: {
        improvedLayout: true
      },
      nodes: {
        shape: "box",
        font: { size: 14 },
        margin: 10
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.7 } },
        smooth: { type: "continuous" }
      }
    };
  }

  private getRelationshipColor(relationshipType: string): string {
    const colors = {
      'FLOW': '#2196f3',
      'SERVING': '#4caf50',
      'ACCESS': '#ff9800',
      'TRIGGERING': '#9c27b0',
      'ASSOCIATION': '#607d8b',
      'AGGREGATION': '#795548',
      'COMPOSITION': '#e91e63',
      'SPECIALIZATION': '#00bcd4'
    };
    return colors[relationshipType as keyof typeof colors] || '#607d8b';
  }

  private mapRelationshipStyle(relationshipType: string): string {
    const styles = {
      'FLOW': 'Asynchronous',
      'SERVING': 'Synchronous',
      'ACCESS': 'Synchronous',
      'TRIGGERING': 'Asynchronous',
      'ASSOCIATION': 'Synchronous'
    };
    return styles[relationshipType as keyof typeof styles] || 'Synchronous';
  }

  private toDslId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }
}
