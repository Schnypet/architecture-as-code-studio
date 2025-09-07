import { TestBed } from '@angular/core/testing';
import { GraphRenderer } from './graph.renderer';
import { ArchitectureModel } from '../models/architecture.model';
import { BusinessActor, Application, TechnologyNode } from '../../generated/api';

describe('GraphRenderer', () => {
  let renderer: GraphRenderer;

  const mockArchitectureModel: ArchitectureModel = {
    uid: 'test-arch-1',
    name: 'Test Architecture',
    description: 'A test architecture model for graph rendering',
    version: '1.0.0',
    businessLayer: {
      actors: [
        { uid: 'actor-1', name: 'Customer', actorType: BusinessActor.ActorTypeEnum.External },
        { uid: 'actor-2', name: 'Admin', actorType: BusinessActor.ActorTypeEnum.Internal }
      ],
      services: [
        { uid: 'service-1', name: 'Customer Service' }
      ]
    },
    applicationLayer: {
      applications: [
        { uid: 'app-1', name: 'Web App' }
      ],
      components: [
        { uid: 'comp-1', name: 'API Gateway' }
      ]
    },
    technologyLayer: {
      nodes: [
        { uid: 'node-1', name: 'Web Server' }
      ],
      services: [
        { uid: 'tech-service-1', name: 'Database' }
      ]
    },
    relationships: [
      { source: { uid: 'actor-1' }, target: { uid: 'app-1' }, description: 'Uses' },
      { source: { uid: 'app-1' }, target: { uid: 'comp-1' }, description: 'Contains' },
      { source: { uid: 'comp-1' }, target: { uid: 'tech-service-1' }, description: 'Connects to' }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GraphRenderer]
    });
    renderer = TestBed.inject(GraphRenderer);
  });

  it('should be created', () => {
    expect(renderer).toBeTruthy();
  });

  it('should have correct metadata', () => {
    expect(renderer.name).toBe('graph');
    expect(renderer.description).toBe('Interactive network graph visualization');
    expect(renderer.version).toBe('1.0.0');
    expect(renderer.supportedFormats).toEqual(['json', 'visjs']);
  });

  it('should support json and visjs formats', () => {
    expect(renderer.supportsFormat('json')).toBe(true);
    expect(renderer.supportsFormat('visjs')).toBe(true);
    expect(renderer.supportsFormat('plantuml')).toBe(false);
    expect(renderer.supportsFormat('unknown')).toBe(false);
  });

  it('should validate architecture model successfully', () => {
    const validation = renderer.validate(mockArchitectureModel);
    expect(validation.isValid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it('should validate architecture model with missing uid', () => {
    const invalidModel = { ...mockArchitectureModel, uid: '' };
    const validation = renderer.validate(invalidModel);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors[0].code).toBe('INVALID_MODEL');
  });

  it('should render JSON format correctly', () => {
    const result = renderer.render(mockArchitectureModel, { format: 'json' });
    
    expect(result.format).toBe('json');
    expect(result.rendererName).toBe('graph');
    expect(result.content).toBeDefined();
    
    const graphData = JSON.parse(result.content);
    expect(graphData.nodes).toBeDefined();
    expect(graphData.edges).toBeDefined();
    expect(graphData.nodes.length).toBeGreaterThan(0);
    expect(graphData.edges.length).toBeGreaterThan(0);
  });

  it('should render VisJS format correctly', () => {
    const result = renderer.render(mockArchitectureModel, { format: 'visjs' });
    
    expect(result.format).toBe('visjs');
    expect(result.rendererName).toBe('graph');
    expect(result.content).toBeDefined();
    
    const graphData = JSON.parse(result.content);
    expect(graphData.nodes).toBeDefined();
    expect(graphData.edges).toBeDefined();
    expect(Array.isArray(graphData.nodes)).toBe(true);
    expect(Array.isArray(graphData.edges)).toBe(true);
  });

  it('should create nodes for all architecture elements', () => {
    const result = renderer.render(mockArchitectureModel, { format: 'json' });
    const graphData = JSON.parse(result.content);
    
    // Should have nodes for: 2 actors + 1 service + 1 app + 1 component + 1 node + 1 tech service = 7 nodes
    expect(graphData.nodes.length).toBe(7);
    
    // Check specific nodes exist
    const nodeIds = graphData.nodes.map((n: any) => n.id);
    expect(nodeIds).toContain('actor-1');
    expect(nodeIds).toContain('actor-2');
    expect(nodeIds).toContain('service-1');
    expect(nodeIds).toContain('app-1');
    expect(nodeIds).toContain('comp-1');
    expect(nodeIds).toContain('node-1');
    expect(nodeIds).toContain('tech-service-1');
  });

  it('should create edges for all relationships', () => {
    const result = renderer.render(mockArchitectureModel, { format: 'json' });
    const graphData = JSON.parse(result.content);
    
    expect(graphData.edges.length).toBe(3);
    
    // Check specific edges exist
    const edges = graphData.edges;
    expect(edges.some((e: any) => e.from === 'actor-1' && e.to === 'app-1')).toBe(true);
    expect(edges.some((e: any) => e.from === 'app-1' && e.to === 'comp-1')).toBe(true);
    expect(edges.some((e: any) => e.from === 'comp-1' && e.to === 'tech-service-1')).toBe(true);
  });

  it('should assign different colors to different layers', () => {
    const result = renderer.render(mockArchitectureModel, { format: 'visjs' });
    const graphData = JSON.parse(result.content);
    
    const businessNodes = graphData.nodes.filter((n: any) => n.group === 'business');
    const applicationNodes = graphData.nodes.filter((n: any) => n.group === 'application');
    const technologyNodes = graphData.nodes.filter((n: any) => n.group === 'technology');
    
    expect(businessNodes.length).toBe(3); // 2 actors + 1 service
    expect(applicationNodes.length).toBe(2); // 1 app + 1 component  
    expect(technologyNodes.length).toBe(2); // 1 node + 1 tech service
    
    // Check colors are assigned
    businessNodes.forEach((node: any) => {
      expect(node.color).toBe('#e8f4fd');
    });
    applicationNodes.forEach((node: any) => {
      expect(node.color).toBe('#fff2cc');
    });
    technologyNodes.forEach((node: any) => {
      expect(node.color).toBe('#f8cecc');
    });
  });

  it('should include metadata with node and edge counts', () => {
    const result = renderer.render(mockArchitectureModel, { format: 'json' });
    
    expect(result.metadata.nodeCount).toBe(7);
    expect(result.metadata.edgeCount).toBe(3);
    expect(result.metadata.elementCount).toBe(7);
    expect(result.metadata.relationshipCount).toBe(3);
    expect(result.metadata.viewType).toBe('landscape');
  });

  it('should handle architecture without relationships', () => {
    const modelWithoutRelationships = { ...mockArchitectureModel, relationships: [] };
    const result = renderer.render(modelWithoutRelationships, { format: 'json' });
    const graphData = JSON.parse(result.content);
    
    expect(graphData.nodes.length).toBeGreaterThan(0);
    expect(graphData.edges.length).toBe(0);
    expect(result.metadata.edgeCount).toBe(0);
  });

  it('should handle empty architecture layers', () => {
    const emptyModel: ArchitectureModel = {
      uid: 'empty-arch',
      name: 'Empty Architecture',
      description: 'Empty architecture for testing',
      businessLayer: {},
      applicationLayer: {},
      technologyLayer: {},
      relationships: []
    };
    
    const result = renderer.render(emptyModel, { format: 'json' });
    const graphData = JSON.parse(result.content);
    
    expect(graphData.nodes.length).toBe(0);
    expect(graphData.edges.length).toBe(0);
    expect(result.metadata.nodeCount).toBe(0);
    expect(result.metadata.edgeCount).toBe(0);
  });

  it('should get correct capabilities', () => {
    const capabilities = renderer.getCapabilities();
    
    expect(capabilities.multipleViews).toBe(false);
    expect(capabilities.customThemes).toBe(true);
    expect(capabilities.interactivity).toBe(true);
    expect(capabilities.exportFormats).toEqual(['json', 'visjs']);
    expect(capabilities.layoutAlgorithms).toEqual(['force-directed', 'hierarchical']);
    expect(capabilities.filteringSupport).toBe(true);
    expect(capabilities.relationshipTypes).toEqual(['uses', 'contains', 'connects', 'flows']);
  });

  it('should get correct renderer metadata', () => {
    const metadata = renderer.getMetadata();
    
    expect(metadata.author).toBe('Architecture as Code Studio');
    expect(metadata.license).toBe('MIT');
    expect(metadata.tags).toEqual(['graph', 'network', 'interactive', 'visualization']);
    expect(metadata.dependencies).toEqual(['vis-network']);
  });
});