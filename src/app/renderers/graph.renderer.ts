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

// Graph data interfaces
export interface GraphNode {
  id: string;
  label: string;
  group: string;
  color?: string;
  shape?: string;
  title?: string;
  level?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  arrows?: string;
  color?: string;
  dashes?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  options: any;
}

@Injectable({
  providedIn: 'root'
})
export class GraphRenderer extends AbstractRenderer<DiagramOutput> {
  readonly name = 'graph';
  readonly description = 'Interactive network graph visualization';
  readonly supportedFormats = ['json', 'visjs'] as const;
  readonly version = '1.0.0';

  render(architecture: ArchitectureModel, options?: RenderOptions): DiagramOutput {
    const startTime = Date.now();
    this.logRenderingInfo(architecture, options?.format || 'json');

    const graphData = this.generateGraphData(architecture);
    const format = options?.format || 'json';
    
    let content: string;
    if (format === 'visjs') {
      content = this.generateVisJSConfig(graphData);
    } else {
      content = JSON.stringify(graphData, null, 2);
    }

    const renderingTime = Date.now() - startTime;
    const metadata = this.createDiagramMetadata(architecture, options?.viewType || 'landscape', renderingTime);

    return {
      content,
      format: format as any,
      metadata: {
        ...metadata,
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length
      },
      rendererName: this.name,
      timestamp: new Date()
    };
  }

  getCapabilities(): RendererCapabilities {
    return {
      multipleViews: true,
      customThemes: true,
      interactivity: true,
      exportFormats: ['json', 'visjs'],
      layoutAlgorithms: ['hierarchical', 'force', 'circular'],
      filteringSupport: true,
      relationshipTypes: ['uses', 'contains', 'implements', 'accesses']
    };
  }

  getMetadata(): RendererMetadata {
    return {
      author: 'Architecture as Code Studio',
      license: 'MIT',
      homepage: 'https://visjs.github.io/vis-network/',
      repository: 'https://github.com/visjs/vis-network',
      tags: ['graph', 'network', 'interactive', 'visualization'],
      dependencies: ['vis-network']
    };
  }

  private generateGraphData(architecture: ArchitectureModel): GraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Add business actors as nodes
    if (architecture.businessLayer?.actors) {
      architecture.businessLayer.actors.forEach(actor => {
        if (actor.uid && actor.name) {
          nodes.push({
            id: this.sanitizeId(actor.uid),
            label: actor.name,
            group: 'business',
            color: '#4CAF50',
            shape: 'icon',
            title: `${actor.name}\\n${actor.description || 'Business Actor'}\\nType: ${actor.actorType || 'Unknown'}`,
            level: 0
          });
        }
      });
    }

    // Add applications as nodes
    if (architecture.applicationLayer?.applications) {
      architecture.applicationLayer.applications.forEach(app => {
        if (app.uid && app.name) {
          nodes.push({
            id: this.sanitizeId(app.uid),
            label: app.name,
            group: 'application',
            color: '#2196F3',
            shape: 'box',
            title: `${app.name}\\n${app.description || 'Application'}\\nLifecycle: ${app.lifecycle || 'Unknown'}`,
            level: 1
          });
        }
      });
    }

    // Add application components as nodes
    if (architecture.applicationLayer?.components) {
      architecture.applicationLayer.components.forEach(component => {
        if (component.uid && component.name) {
          nodes.push({
            id: this.sanitizeId(component.uid),
            label: component.name,
            group: 'component',
            color: '#FF9800',
            shape: 'ellipse',
            title: `${component.name}\\n${component.description || 'Component'}\\nType: ${component.componentType || 'Unknown'}\\nTech: ${component.technology || 'N/A'}`,
            level: 2
          });
        }
      });
    }

    // Add technology nodes
    if (architecture.technologyLayer?.nodes) {
      architecture.technologyLayer.nodes.forEach(node => {
        if (node.uid && node.name) {
          nodes.push({
            id: this.sanitizeId(node.uid),
            label: node.name,
            group: 'technology',
            color: '#9C27B0',
            shape: 'database',
            title: `${node.name}\\n${node.description || 'Technology Node'}\\nOS: ${node.operatingSystem || 'Unknown'}\\nLocation: ${node.location || 'N/A'}`,
            level: 3
          });
        }
      });
    }

    // Add system software
    if (architecture.technologyLayer?.systemSoftware) {
      architecture.technologyLayer.systemSoftware.forEach(software => {
        if (software.uid && software.name) {
          nodes.push({
            id: this.sanitizeId(software.uid),
            label: software.name,
            group: 'software',
            color: '#607D8B',
            shape: 'square',
            title: `${software.name}\\n${software.description || 'System Software'}\\nVendor: ${software.vendor || 'Unknown'}\\nVersion: ${software.version || 'N/A'}`,
            level: 3
          });
        }
      });
    }

    // Add relationships as edges
    if (architecture.relationships) {
      architecture.relationships.forEach(rel => {
        if (rel.source && rel.target) {
          const sourceId = this.sanitizeId(this.extractElementId(rel.source));
          const targetId = this.sanitizeId(this.extractElementId(rel.target));
          
          edges.push({
            from: sourceId,
            to: targetId,
            label: rel.description || '',
            arrows: 'to',
            color: this.getRelationshipColor(rel.relationshipType),
            dashes: rel.relationshipType === 'FLOW' ? true : false
          });
        }
      });
    }

    return {
      nodes,
      edges,
      options: this.getDefaultGraphOptions()
    };
  }

  private generateVisJSConfig(graphData: GraphData): string {
    return `// Vis.js Network Configuration
const nodes = new vis.DataSet(${JSON.stringify(graphData.nodes, null, 2)});
const edges = new vis.DataSet(${JSON.stringify(graphData.edges, null, 2)});

const data = {
  nodes: nodes,
  edges: edges
};

const options = ${JSON.stringify(graphData.options, null, 2)};

// Create network
const container = document.getElementById('mynetworkid');
const network = new vis.Network(container, data, options);

// Add event listeners
network.on('click', function(params) {
  if (params.nodes.length > 0) {
    console.log('Node clicked:', params.nodes[0]);
  }
});`;
  }

  private getDefaultGraphOptions(): any {
    return {
      layout: {
        hierarchical: {
          direction: 'UD',
          sortMethod: 'directed',
          levelSeparation: 150,
          nodeSpacing: 200,
          treeSpacing: 200
        }
      },
      nodes: {
        borderWidth: 2,
        shadow: true,
        font: {
          size: 12,
          color: '#000000'
        }
      },
      edges: {
        arrows: {
          to: { enabled: true, scaleFactor: 1 }
        },
        shadow: true,
        smooth: true,
        font: {
          size: 11,
          color: '#666666'
        }
      },
      groups: {
        business: {
          color: { background: '#4CAF50', border: '#388E3C' },
          shape: 'icon',
          icon: { face: 'FontAwesome', code: '\uf007', size: 50, color: '#ffffff' }
        },
        application: {
          color: { background: '#2196F3', border: '#1976D2' },
          shape: 'box'
        },
        component: {
          color: { background: '#FF9800', border: '#F57C00' },
          shape: 'ellipse'
        },
        technology: {
          color: { background: '#9C27B0', border: '#7B1FA2' },
          shape: 'database'
        },
        software: {
          color: { background: '#607D8B', border: '#455A64' },
          shape: 'square'
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 300,
        hideEdgesOnDrag: false,
        hideNodesOnDrag: false
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 100 }
      }
    };
  }

  private getRelationshipColor(type?: string): string {
    switch (type) {
      case 'FLOW': return '#FF5722';
      case 'SERVING': return '#4CAF50';
      case 'ACCESS': return '#2196F3';
      case 'TRIGGERING': return '#FF9800';
      case 'COMPOSITION': return '#9C27B0';
      default: return '#666666';
    }
  }

  // Public method for analyzing graph
  analyzeModel(architecture: ArchitectureModel): any {
    const graphData = this.generateGraphData(architecture);
    
    const nodesByGroup = graphData.nodes.reduce((acc, node) => {
      acc[node.group] = (acc[node.group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const centralityScores = this.calculateCentrality(graphData);
    
    return {
      nodes: {
        total: graphData.nodes.length,
        byGroup: nodesByGroup
      },
      edges: graphData.edges.length,
      density: this.calculateDensity(graphData),
      centrality: centralityScores,
      complexity: this.calculateComplexity(graphData)
    };
  }

  private calculateDensity(graphData: GraphData): number {
    const n = graphData.nodes.length;
    const m = graphData.edges.length;
    return n > 1 ? (2 * m) / (n * (n - 1)) : 0;
  }

  private calculateCentrality(graphData: GraphData): any {
    // Simple degree centrality calculation
    const degrees: Record<string, number> = {};
    
    graphData.nodes.forEach(node => {
      degrees[node.id] = 0;
    });
    
    graphData.edges.forEach(edge => {
      degrees[edge.from] = (degrees[edge.from] || 0) + 1;
      degrees[edge.to] = (degrees[edge.to] || 0) + 1;
    });
    
    const maxDegree = Math.max(...Object.values(degrees));
    const mostConnected = Object.entries(degrees)
      .filter(([_, degree]) => degree === maxDegree)
      .map(([nodeId]) => nodeId);
    
    return {
      maxDegree,
      mostConnectedNodes: mostConnected,
      averageDegree: Object.values(degrees).reduce((a, b) => a + b, 0) / graphData.nodes.length
    };
  }

  private calculateComplexity(graphData: GraphData): 'low' | 'medium' | 'high' {
    const nodeCount = graphData.nodes.length;
    const edgeCount = graphData.edges.length;
    const complexity = nodeCount + (edgeCount * 1.5);
    
    if (complexity < 20) return 'low';
    if (complexity < 100) return 'medium';
    return 'high';
  }
}