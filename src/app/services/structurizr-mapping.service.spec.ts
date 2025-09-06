import { TestBed } from '@angular/core/testing';
import { StructurizrMappingService } from './structurizr-mapping.service';
import { 
  Architecture,
  BusinessLayer,
  ApplicationLayer,
  TechnologyLayer,
  BusinessActor,
  Application,
  ApplicationComponent
} from '../../generated/api';

describe('StructurizrMappingService', () => {
  let service: StructurizrMappingService;

  const mockArchitecture: Architecture = {
    uid: 'test-arch-1',
    name: 'Test Architecture',
    description: 'A test architecture model',
    version: '1.0.0',
    businessLayer: {
      uid: 'business-layer-1',
      actors: [
        {
          uid: 'actor-1',
          name: 'Customer',
          description: 'External customer using the system',
          actorType: 'EXTERNAL',
          properties: {
            'location': 'External',
            'priority': 'High'
          }
        }
      ],
      domains: [],
      capabilities: [],
      processes: [],
      services: []
    },
    applicationLayer: {
      uid: 'app-layer-1',
      applications: [
        {
          uid: 'app-1',
          name: 'Customer Portal',
          description: 'Web portal for customers',
          stereoType: 'BUSINESS_APPLICATION',
          lifecycle: 'ACTIVE',
          vendor: 'Internal'
        }
      ],
      components: [
        {
          uid: 'comp-1',
          name: 'Authentication Service',
          description: 'Handles user authentication',
          componentType: 'BACKEND',
          technology: 'Spring Boot'
        }
      ],
      services: [],
      interfaces: []
    },
    technologyLayer: {
      uid: 'tech-layer-1',
      nodes: [],
      services: [],
      artifacts: [],
      interfaces: [],
      systemSoftware: []
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StructurizrMappingService]
    });
    service = TestBed.inject(StructurizrMappingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a workspace from architecture', () => {
    const context = service.createWorkspace(mockArchitecture);
    
    expect(context).toBeDefined();
    expect(context.workspace).toBeDefined();
    expect(context.model).toBeDefined();
    expect(context.workspace.getName()).toBe('Test Architecture');
    expect(context.workspace.getDescription()).toBe('A test architecture model');
  });

  it('should map architecture to Structurizr context', () => {
    const context = service.mapArchitectureToStructurizr(mockArchitecture);
    
    expect(context).toBeDefined();
    expect(context.people.size).toBe(1);
    expect(context.systems.size).toBe(1);
    expect(context.containers.size).toBe(1);
    
    // Check person mapping
    const customer = context.people.get('actor-1');
    expect(customer).toBeDefined();
    expect(customer?.getName()).toBe('Customer');
    expect(customer?.getDescription()).toBe('External customer using the system');
    
    // Check system mapping
    const portal = context.systems.get('app-1');
    expect(portal).toBeDefined();
    expect(portal?.getName()).toBe('Customer Portal');
    expect(portal?.getDescription()).toBe('Web portal for customers');
    
    // Check container mapping
    const authService = context.containers.get('comp-1');
    expect(authService).toBeDefined();
    expect(authService?.getName()).toBe('Authentication Service');
    expect(authService?.getTechnology()).toBe('Spring Boot');
  });

  it('should analyze architecture data', () => {
    const analysis = service.analyzeArchitectureData(mockArchitecture);
    
    expect(analysis).toBeDefined();
    expect(analysis.businessLayer.actorCount).toBe(1);
    expect(analysis.applicationLayer.applicationCount).toBe(1);
    expect(analysis.applicationLayer.componentCount).toBe(1);
    expect(analysis.technologyLayer.nodeCount).toBe(0);
  });

  it('should generate PlantUML for system context view', () => {
    const context = service.mapArchitectureToStructurizr(mockArchitecture);
    const plantuml = service.generateC4PlantUML(context, 'system-context');
    
    expect(plantuml).toContain('@startuml');
    expect(plantuml).toContain('@enduml');
    expect(plantuml).toContain('Person(actor_1, "Customer"');
    expect(plantuml).toContain('System(app_1, "Customer Portal"');
    expect(plantuml).toContain('title Test Architecture');
  });

  it('should generate PlantUML for container view', () => {
    const context = service.mapArchitectureToStructurizr(mockArchitecture);
    const plantuml = service.generateC4PlantUML(context, 'container');
    
    expect(plantuml).toContain('@startuml');
    expect(plantuml).toContain('@enduml');
    expect(plantuml).toContain('Container(comp_1, "Authentication Service"');
    expect(plantuml).toContain('Spring Boot');
  });

  it('should handle empty architecture gracefully', () => {
    const emptyArchitecture: Architecture = {
      uid: 'empty-arch',
      name: 'Empty Architecture',
      description: 'Empty test architecture'
    };
    
    const context = service.mapArchitectureToStructurizr(emptyArchitecture);
    
    expect(context.people.size).toBe(0);
    expect(context.systems.size).toBe(0);
    expect(context.containers.size).toBe(0);
  });

  it('should sanitize IDs correctly', () => {
    const testId = 'test-id-with-special@chars#123';
    const sanitizedId = (service as any).sanitizeId(testId);
    
    expect(sanitizedId).toBe('test_id_with_special_chars_123');
  });
});