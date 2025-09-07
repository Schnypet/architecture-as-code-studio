import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiagramViewerComponent } from './diagram-viewer.component';
import { RendererRegistryService } from '../services/renderer-registry.service';
import { DiagramService } from '../services/diagram.service';
import { GraphRenderer } from '../renderers/graph.renderer';
import { PlantUMLRenderer } from '../renderers/plantuml.renderer';
import { StructurizrRenderer } from '../renderers/structurizr.renderer';
import { LikeC4Renderer } from '../renderers/likec4.renderer';
import { Architecture, BusinessActor, Application, TechnologyNode } from '../../generated/api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
// Note: TabViewModule and AccordionModule removed as not needed for core tests
import { PanelModule } from 'primeng/panel';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { signal } from '@angular/core';

describe('DiagramViewerComponent', () => {
  let component: DiagramViewerComponent;
  let fixture: ComponentFixture<DiagramViewerComponent>;
  let diagramService: DiagramService;

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
        DiagramViewerComponent,
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        // TabViewModule and AccordionModule removed
        PanelModule,
        MessageModule,
        ProgressBarModule
      ],
      providers: [
        DiagramService,
        RendererRegistryService,
        GraphRenderer,
        PlantUMLRenderer,
        StructurizrRenderer,
        LikeC4Renderer
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DiagramViewerComponent);
    component = fixture.componentInstance;
    diagramService = TestBed.inject(DiagramService);

    // Set up component inputs
    component.plantUMLCode = '@startuml\nTest Diagram\n@enduml';
    component.architectureName = 'Test Architecture';
    component.architectureContext = mockArchitecture;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.showModelData()).toBe(false);
  });

  it('should toggle model data panel', () => {
    expect(component.showModelData()).toBe(false);
    
    component.toggleModelData();
    expect(component.showModelData()).toBe(true);
    
    component.toggleModelData();
    expect(component.showModelData()).toBe(false);
  });

  it('should analyze architecture when architecture context is provided', () => {
    component.architectureContext = mockArchitecture;
    component.ngOnInit();
    
    const analysis = component.modelAnalysis();
    expect(analysis).toBeDefined();
    expect(analysis?.businessLayer.actorCount).toBe(2);
    expect(analysis?.businessLayer.serviceCount).toBe(1);
    expect(analysis?.applicationLayer.applicationCount).toBe(1);
    expect(analysis?.applicationLayer.componentCount).toBe(1);
    expect(analysis?.technologyLayer.nodeCount).toBe(1);
    expect(analysis?.technologyLayer.serviceCount).toBe(1);
  });

  it('should display PlantUML code when provided', () => {
    const plantUMLCode = '@startuml\nTest PlantUML\n@enduml';
    component.plantUMLCode = plantUMLCode;
    fixture.detectChanges();
    
    expect(component.plantUMLCode).toBe(plantUMLCode);
  });

  it('should show architecture name in title', () => {
    const architectureName = 'My Test Architecture';
    component.architectureName = architectureName;
    fixture.detectChanges();
    
    expect(component.architectureName).toBe(architectureName);
  });

  it('should handle missing architecture context gracefully', () => {
    component.architectureContext = undefined;
    component.ngOnInit();
    
    expect(component.modelAnalysis()).toBeNull();
  });

  it('should render component without errors when model data is shown', () => {
    component.architectureContext = mockArchitecture;
    component.showModelData.set(true);
    
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });
});