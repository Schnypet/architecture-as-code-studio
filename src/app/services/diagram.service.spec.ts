import { TestBed } from '@angular/core/testing';
import { DiagramService } from './diagram.service';
import { RendererRegistryService } from './renderer-registry.service';
import { GraphRenderer } from '../renderers/graph.renderer';
import { PlantUMLRenderer } from '../renderers/plantuml.renderer';
import { StructurizrRenderer } from '../renderers/structurizr.renderer';
import { LikeC4Renderer } from '../renderers/likec4.renderer';
import { ArchitectureModel } from '../models/architecture.model';
import { Architecture, BusinessActor, Application, TechnologyNode } from '../../generated/api';

describe('DiagramService', () => {
  let service: DiagramService;
  let registryService: RendererRegistryService;

  const mockArchitecture: Architecture = {
    uid: 'test-arch-1',
    name: 'Test Architecture',
    description: 'A test architecture model',
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
      { source: { uid: 'actor-1' }, target: { uid: 'app-1' }, description: 'Uses' }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DiagramService,
        RendererRegistryService,
        GraphRenderer,
        PlantUMLRenderer,
        StructurizrRenderer,
        LikeC4Renderer
      ]
    });
    
    service = TestBed.inject(DiagramService);
    registryService = TestBed.inject(RendererRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with all renderers registered', () => {
    const renderers = registryService.getAllRenderers();
    expect(renderers.length).toBe(4);
    expect(renderers.map(r => r.name)).toContain('graph');
    expect(renderers.map(r => r.name)).toContain('plantuml');
    expect(renderers.map(r => r.name)).toContain('structurizr');
    expect(renderers.map(r => r.name)).toContain('likec4');
  });

  it('should convert Architecture to ArchitectureModel with defaults', () => {
    const model = service.convertToArchitectureModel(mockArchitecture);
    
    expect(model.uid).toBe('test-arch-1');
    expect(model.name).toBe('Test Architecture');
    expect(model.description).toBe('A test architecture model');
    expect(model.businessLayer).toBeDefined();
    expect(model.applicationLayer).toBeDefined();
    expect(model.technologyLayer).toBeDefined();
    expect(model.relationships).toBeDefined();
  });

  it('should convert Architecture without uid and name', () => {
    const archWithoutUidName: Architecture = {
      description: 'Test without uid/name'
    };
    
    const model = service.convertToArchitectureModel(archWithoutUidName);
    
    expect(model.uid).toContain('default-architecture-');
    expect(model.name).toBe('Unnamed Architecture');
    expect(model.description).toBe('Test without uid/name');
  });

  it('should analyze architecture correctly', () => {
    const analysis = service.analyzeArchitecture(mockArchitecture);
    
    expect(analysis.businessLayer.actorCount).toBe(2);
    expect(analysis.businessLayer.serviceCount).toBe(1);
    expect(analysis.applicationLayer.applicationCount).toBe(1);
    expect(analysis.applicationLayer.componentCount).toBe(1);
    expect(analysis.technologyLayer.nodeCount).toBe(1);
    expect(analysis.technologyLayer.serviceCount).toBe(1);
    expect(analysis.relationshipCount).toBe(1);
    expect(analysis.totalElements).toBe(6);
  });

  it('should render diagram with graph renderer', (done) => {
    service.renderDiagram(mockArchitecture, 'graph', 'json').subscribe(output => {
      expect(output).toBeDefined();
      expect(output.rendererName).toBe('graph');
      expect(output.format).toBe('json');
      expect(output.content).toContain('nodes');
      expect(output.content).toContain('edges');
      expect(output.metadata.elementCount).toBeGreaterThan(0);
      done();
    });
  });

  it('should render diagram with plantuml renderer', (done) => {
    service.renderDiagram(mockArchitecture, 'plantuml', 'c4').subscribe(output => {
      expect(output).toBeDefined();
      expect(output.rendererName).toBe('plantuml');
      expect(output.format).toBe('c4');
      expect(output.content).toContain('@startuml');
      expect(output.content).toContain('@enduml');
      expect(output.metadata.elementCount).toBeGreaterThan(0);
      done();
    });
  });

  it('should render diagram with structurizr renderer', (done) => {
    service.renderDiagram(mockArchitecture, 'structurizr', 'dsl').subscribe(output => {
      expect(output).toBeDefined();
      expect(output.rendererName).toBe('structurizr');
      expect(output.format).toBe('dsl');
      expect(output.content).toContain('workspace');
      expect(output.metadata.elementCount).toBeGreaterThan(0);
      done();
    });
  });

  it('should render diagram with likec4 renderer', (done) => {
    service.renderDiagram(mockArchitecture, 'likec4', 'dsl').subscribe(output => {
      expect(output).toBeDefined();
      expect(output.rendererName).toBe('likec4');
      expect(output.format).toBe('dsl');
      expect(output.content.length).toBeGreaterThan(0);
      expect(output.metadata.elementCount).toBeGreaterThan(0);
      done();
    });
  });

  it('should handle unknown renderer gracefully', (done) => {
    service.renderDiagram(mockArchitecture, 'unknown', 'json').subscribe({
      next: () => {
        fail('Should not succeed with unknown renderer');
      },
      error: (error: any) => {
        expect(error.message).toContain('not found');
        done();
      }
    });
  });

  it('should handle unsupported format gracefully', (done) => {
    service.renderDiagram(mockArchitecture, 'graph', 'unsupported' as any).subscribe({
      next: () => {
        fail('Should not succeed with unsupported format');
      },
      error: (error: any) => {
        expect(error.message).toContain('does not support format');
        done();
      }
    });
  });

  it('should validate architecture model', () => {
    const model = service.convertToArchitectureModel(mockArchitecture);
    const validation = service.validateArchitecture(model);
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it('should detect validation errors for invalid model', () => {
    const invalidModel: ArchitectureModel = {
      uid: '',
      name: '',
      description: ''
    };
    
    const validation = service.validateArchitecture(invalidModel);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors.some((e: any) => e.code === 'MISSING_UID')).toBe(true);
    expect(validation.errors.some((e: any) => e.code === 'MISSING_NAME')).toBe(true);
  });
});