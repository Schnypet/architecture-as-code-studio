import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ArchitectureDashboardComponent } from './architecture-dashboard.component';
import { ArchitectureService } from '../services/architecture.service';
import { DiagramService } from '../services/diagram.service';
import { RendererRegistryService } from '../services/renderer-registry.service';
import { GraphRenderer } from '../renderers/graph.renderer';
import { PlantUMLRenderer } from '../renderers/plantuml.renderer';
import { StructurizrRenderer } from '../renderers/structurizr.renderer';
import { LikeC4Renderer } from '../renderers/likec4.renderer';
import { 
  ArchitectureService as GeneratedArchitectureService,
  ApplicationLayerService,
  BusinessLayerService,
  TechnologyLayerService,
  Architecture,
  BusinessActor,
  Application,
  TechnologyNode
} from '../../generated/api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { PanelModule } from 'primeng/panel';
import { DiagramViewerComponent } from './diagram-viewer.component';
import { of, throwError } from 'rxjs';

describe('ArchitectureDashboardComponent', () => {
  let component: ArchitectureDashboardComponent;
  let fixture: ComponentFixture<ArchitectureDashboardComponent>;
  let architectureService: ArchitectureService;
  let diagramService: DiagramService;
  let httpMock: HttpTestingController;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ArchitectureDashboardComponent,
        HttpClientTestingModule,
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        TableModule,
        ProgressBarModule,
        MessageModule,
        PanelModule,
        DiagramViewerComponent
      ],
      providers: [
        ArchitectureService,
        DiagramService,
        RendererRegistryService,
        GeneratedArchitectureService,
        ApplicationLayerService,
        BusinessLayerService,
        TechnologyLayerService,
        GraphRenderer,
        PlantUMLRenderer,
        StructurizrRenderer,
        LikeC4Renderer
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ArchitectureDashboardComponent);
    component = fixture.componentInstance;
    architectureService = TestBed.inject(ArchitectureService);
    diagramService = TestBed.inject(DiagramService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.architectures()).toEqual([]);
    expect(component.selectedArchitecture()).toBeNull();
    expect(component.isLoading()).toBe(false);
    expect(component.isConnected()).toBe(false);
    expect(component.plantUMLServerAvailable()).toBe(false);
    expect(component.generatedDiagram()).toBe('');
  });

  it('should test connection on init', async () => {
    spyOn(component, 'testConnection').and.returnValue(Promise.resolve());
    spyOn(component, 'checkPlantUMLServer').and.returnValue(Promise.resolve());
    
    component.ngOnInit();
    
    expect(component.testConnection).toHaveBeenCalled();
    expect(component.checkPlantUMLServer).toHaveBeenCalled();
  });

  it('should handle successful connection test', async () => {
    const testConnectionSpy = spyOn(architectureService, 'testConnection').and.returnValue(of(true));
    const loadArchitecturesSpy = spyOn(component, 'loadArchitectures').and.returnValue(Promise.resolve());
    
    await component.testConnection();
    
    expect(testConnectionSpy).toHaveBeenCalled();
    expect(component.isConnected()).toBe(true);
    expect(component.connectionMessage()).toBe('Connected to Architecture Engine API');
    expect(loadArchitecturesSpy).toHaveBeenCalled();
    expect(component.isTestingConnection()).toBe(false);
  });

  it('should handle failed connection test', async () => {
    const testConnectionSpy = spyOn(architectureService, 'testConnection').and.returnValue(of(false));
    
    await component.testConnection();
    
    expect(testConnectionSpy).toHaveBeenCalled();
    expect(component.isConnected()).toBe(false);
    expect(component.connectionMessage()).toBe('Failed to connect to API server');
    expect(component.isTestingConnection()).toBe(false);
  });

  it('should handle connection test error', async () => {
    const error = new Error('Network error');
    spyOn(architectureService, 'testConnection').and.returnValue(throwError(() => error));
    
    await component.testConnection();
    
    expect(component.isConnected()).toBe(false);
    expect(component.connectionMessage()).toContain('Connection failed: Network error');
    expect(component.isTestingConnection()).toBe(false);
  });

  it('should load architectures successfully', async () => {
    const mockArchitectures = [mockArchitecture];
    spyOn(architectureService, 'getAllArchitectures').and.returnValue(of(mockArchitectures));
    
    await component.loadArchitectures();
    
    expect(component.architectures()).toEqual(mockArchitectures);
    expect(component.connectionMessage()).toBe('Successfully loaded 1 architectures');
    expect(component.isLoading()).toBe(false);
  });

  it('should handle invalid architectures response', async () => {
    spyOn(architectureService, 'getAllArchitectures').and.returnValue(of(null as any));
    
    await component.loadArchitectures();
    
    expect(component.architectures()).toEqual([]);
    expect(component.connectionMessage()).toBe('Received invalid response from server');
    expect(component.isLoading()).toBe(false);
  });

  it('should handle architectures loading error', async () => {
    const error = new Error('Network error');
    spyOn(architectureService, 'getAllArchitectures').and.returnValue(throwError(() => error));
    
    await component.loadArchitectures();
    
    expect(component.architectures()).toEqual([]);
    expect(component.connectionMessage()).toContain('Error loading architectures: Network error');
    expect(component.isLoading()).toBe(false);
  });

  it('should reload models successfully', async () => {
    const mockArchitectures = [mockArchitecture];
    spyOn(architectureService, 'reloadModels').and.returnValue(of(mockArchitectures));
    
    await component.reloadModels();
    
    expect(component.architectures()).toEqual(mockArchitectures);
    expect(component.connectionMessage()).toBe('Models reloaded successfully - 1 architectures');
    expect(component.isReloading()).toBe(false);
  });

  it('should select architecture and analyze it', async () => {
    spyOn(architectureService, 'getCompleteArchitecture').and.returnValue(of(mockArchitecture));
    spyOn(diagramService, 'analyzeArchitecture').and.returnValue({
      businessLayer: { actorCount: 2, serviceCount: 1, capabilityCount: 0, domainCount: 0, processCount: 0 },
      applicationLayer: { applicationCount: 1, componentCount: 1, serviceCount: 0, interfaceCount: 0 },
      technologyLayer: { nodeCount: 1, serviceCount: 1, artifactCount: 0, interfaceCount: 0, systemSoftwareCount: 0 },
      relationshipCount: 1,
      totalElements: 6
    });
    spyOn(component, 'generateDiagram').and.returnValue(Promise.resolve());
    
    await component.selectArchitecture(mockArchitecture);
    
    expect(component.selectedArchitecture()).toEqual(mockArchitecture);
    expect(component.analysisData()).toBeDefined();
    expect(component.analysisData()?.businessLayer.actorCount).toBe(2);
    expect(component.isAnalyzing()).toBe(false);
  });

  it('should handle architecture selection error', async () => {
    const error = new Error('Failed to load complete architecture');
    spyOn(architectureService, 'getCompleteArchitecture').and.returnValue(throwError(() => error));
    
    await component.selectArchitecture(mockArchitecture);
    
    expect(component.selectedArchitecture()).toEqual(mockArchitecture);
    expect(component.isAnalyzing()).toBe(false);
  });

  it('should generate diagram successfully', async () => {
    component.selectedArchitecture.set(mockArchitecture);
    const mockOutput = {
      content: '@startuml\nTest diagram\n@enduml',
      format: 'c4' as any,
      metadata: {
        viewType: 'landscape' as any,
        elementCount: 6,
        relationshipCount: 1,
        layerDistribution: { business: 3, application: 2, technology: 2 }
      },
      rendererName: 'plantuml',
      timestamp: new Date()
    };
    
    spyOn(diagramService, 'renderDiagram').and.returnValue(of(mockOutput));
    
    await component.generateDiagram();
    
    expect(component.generatedDiagram()).toBe('@startuml\nTest diagram\n@enduml');
    expect(component.architectureContext()).toEqual(mockArchitecture);
    expect(component.isGeneratingDiagram()).toBe(false);
  });

  it('should handle diagram generation error', async () => {
    component.selectedArchitecture.set(mockArchitecture);
    const error = new Error('Rendering failed');
    spyOn(diagramService, 'renderDiagram').and.returnValue(throwError(() => error));
    
    await component.generateDiagram();
    
    expect(component.generatedDiagram()).toBe('// Error generating diagram');
    expect(component.isGeneratingDiagram()).toBe(false);
  });

  it('should calculate diagram stats from generated PlantUML', () => {
    const plantUMLCode = `
      @startuml
      Person(customer, "Customer")
      Person(admin, "Admin")
      System(webapp, "Web App")
      Container(gateway, "API Gateway")
      @enduml
    `;
    component.generatedDiagram.set(plantUMLCode);
    
    const stats = component.diagramStats();
    
    expect(stats?.peopleCount).toBe(2);
    expect(stats?.systemsCount).toBe(1);
    expect(stats?.containersCount).toBe(1);
  });

  it('should return null diagram stats when no diagram is generated', () => {
    component.generatedDiagram.set('');
    
    const stats = component.diagramStats();
    
    expect(stats).toBeNull();
  });

  it('should handle analysis data with safe navigation', () => {
    // Test safe navigation in template by setting null analysis data
    component.analysisData.set(null);
    fixture.detectChanges();
    
    // Should not throw error when accessing nested properties
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('should handle empty architectures array', () => {
    (component as any)._architectures.set([]);
    
    const architectures = component.architectures();
    
    expect(architectures).toEqual([]);
    expect(Array.isArray(architectures)).toBe(true);
  });

  it('should handle non-array architectures response', () => {
    (component as any)._architectures.set(null);
    
    const architectures = component.architectures();
    
    expect(architectures).toEqual([]);
    expect(Array.isArray(architectures)).toBe(true);
  });
});