import { TestBed } from '@angular/core/testing';
import { StructurizrMappingService } from './structurizr-mapping.service';
import { 
  Architecture,
  BusinessLayer,
  ApplicationLayer,
  TechnologyLayer,
  BusinessActor,
  Application,
  ApplicationComponent,
  BusinessService,
  TechnologyNode,
  SystemSoftware,
  TechnologyService
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
      services: [
        {
          uid: 'bus-service-1',
          name: 'Customer Support',
          description: 'Customer support business service',
          serviceLevel: 'Standard',
          availability: '24/7'
        }
      ]
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
        },
        {
          uid: 'comp-2',
          name: 'User Repository',
          description: 'User data access component',
          componentType: 'REPOSITORY',
          technology: 'JPA'
        }
      ],
      services: [],
      interfaces: []
    },
    technologyLayer: {
      uid: 'tech-layer-1',
      nodes: [
        {
          uid: 'node-1',
          name: 'Web Server',
          description: 'Main web server',
          nodeType: 'SERVER',
          location: 'Data Center 1',
          capacity: '16GB RAM',
          operatingSystem: 'Ubuntu 20.04'
        }
      ],
      services: [
        {
          uid: 'tech-service-1',
          name: 'Load Balancer',
          description: 'Load balancing service',
          serviceCategory: 'NETWORK',
          provider: 'AWS'
        }
      ],
      artifacts: [],
      interfaces: [],
      systemSoftware: [
        {
          uid: 'software-1',
          name: 'PostgreSQL',
          description: 'Main database',
          softwareType: 'DATABASE',
          vendor: 'PostgreSQL Global Development Group',
          version: '13.4'
        }
      ]
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
    expect(context.name).toBe('Test Architecture');
    expect(context.description).toBe('A test architecture model');
    expect(context.people).toEqual([]);
    expect(context.systems).toEqual([]);
    expect(context.containers).toEqual([]);
    expect(context.services).toEqual([]);
    expect(context.infrastructure).toEqual([]);
  });

  it('should map architecture to Structurizr context', () => {
    const context = service.mapArchitectureToStructurizr(mockArchitecture);
    
    expect(context).toBeDefined();
    expect(context.people.length).toBe(1);
    expect(context.systems.length).toBe(1);
    expect(context.containers.length).toBe(1); // BACKEND component
    expect(context.components.length).toBe(1); // REPOSITORY component
    
    // Check person mapping
    const customer = context.people.find(p => p.id === 'actor-1');
    expect(customer).toBeDefined();
    expect(customer?.name).toBe('Customer');
    expect(customer?.description).toBe('External customer using the system');
    expect(customer?.type).toBe('person');
    
    // Check system mapping
    const portal = context.systems.find(s => s.id === 'app-1');
    expect(portal).toBeDefined();
    expect(portal?.name).toBe('Customer Portal');
    expect(portal?.description).toBe('Web portal for customers');
    expect(portal?.type).toBe('system');
    
    // Check container mapping (BACKEND component mapped as container)
    const authService = context.containers.find(c => c.id === 'comp-1');
    expect(authService).toBeDefined();
    expect(authService?.name).toBe('Authentication Service');
    expect(authService?.technology).toBe('Spring Boot');
    expect(authService?.type).toBe('container');
    
    // Check component mapping (REPOSITORY component mapped as component)
    const userRepo = context.components.find(c => c.id === 'comp-2');
    expect(userRepo).toBeDefined();
    expect(userRepo?.name).toBe('User Repository');
    expect(userRepo?.technology).toBe('JPA');
    expect(userRepo?.type).toBe('component');
  });

  it('should analyze architecture data', () => {
    const analysis = service.analyzeArchitectureData(mockArchitecture);
    
    expect(analysis).toBeDefined();
    expect(analysis.businessLayer.actorCount).toBe(1);
    expect(analysis.businessLayer.serviceCount).toBe(1);
    expect(analysis.applicationLayer.applicationCount).toBe(1);
    expect(analysis.applicationLayer.componentCount).toBe(2);
    expect(analysis.technologyLayer.nodeCount).toBe(1);
    expect(analysis.technologyLayer.serviceCount).toBe(1);
    expect(analysis.technologyLayer.systemSoftwareCount).toBe(1);
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
    expect(plantuml).toContain('Component(comp_2, "User Repository"');
    expect(plantuml).toContain('Spring Boot');
  });

  it('should handle empty architecture gracefully', () => {
    const emptyArchitecture: Architecture = {
      uid: 'empty-arch',
      name: 'Empty Architecture',
      description: 'Empty test architecture'
    };
    
    const context = service.mapArchitectureToStructurizr(emptyArchitecture);
    
    expect(context.people.length).toBe(0);
    expect(context.systems.length).toBe(0);
    expect(context.containers.length).toBe(0);
    expect(context.services.length).toBe(0);
    expect(context.infrastructure.length).toBe(0);
  });

  it('should map services and infrastructure correctly', () => {
    const context = service.mapArchitectureToStructurizr(mockArchitecture);
    
    expect(context.services.length).toBe(1); // only business service (no application services in mock)
    expect(context.infrastructure.length).toBe(3); // node + system software + technology service
    
    // Check business service mapping
    const businessService = context.services.find(s => s.id === 'bus-service-1');
    expect(businessService?.name).toBe('Customer Support');
    expect(businessService?.serviceLevel).toBe('Standard');
    expect(businessService?.availability).toBe('24/7');
    
    // Check technology node mapping
    const webServer = context.infrastructure.find(i => i.id === 'node-1');
    expect(webServer?.name).toBe('Web Server');
    expect(webServer?.nodeType).toBe('SERVER');
    expect(webServer?.location).toBe('Data Center 1');
    
    // Check system software mapping
    const database = context.infrastructure.find(i => i.id === 'software-1');
    expect(database?.name).toBe('PostgreSQL');
    expect(database?.technology).toBe('PostgreSQL Global Development Group 13.4');
  });

  it('should sanitize IDs correctly', () => {
    const testId = 'test-id-with-special@chars#123';
    const sanitizedId = (service as any).sanitizeId(testId);
    
    expect(sanitizedId).toBe('test_id_with_special_chars_123');
  });
});