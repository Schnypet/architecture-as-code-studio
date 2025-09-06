import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG components
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { PanelModule } from 'primeng/panel';

import { ArchitectureService } from '../services/architecture.service';
import { StructurizrMappingService } from '../services/structurizr-mapping.service';
import { DiagramRenderingService } from '../services/diagram-rendering.service';
import { Architecture } from '../../generated/api';
import { DiagramViewerComponent } from './diagram-viewer.component';

@Component({
  selector: 'app-architecture-dashboard',
  standalone: true,
  imports: [
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
  template: `
    <div class="dashboard-container">
      <!-- Compact Header Toolbar -->
      <div class="header-toolbar">
        <div class="title-section">
          <i class="pi pi-objects-column"></i>
          <h1>Architecture as Code Studio</h1>
          <div class="status-badges">
            <span class="status-badge" 
                  [class.connected]="isConnected()" 
                  [class.disconnected]="!isConnected()">
              <i class="pi" [class.pi-link]="isConnected()" [class.pi-times-circle]="!isConnected()"></i>
              {{ isConnected() ? 'Connected' : 'Disconnected' }}
            </span>
            <span class="status-badge"
                  [class.available]="plantUMLServerAvailable()" 
                  [class.unavailable]="!plantUMLServerAvailable()">
              <i class="pi" [class.pi-palette]="plantUMLServerAvailable()" [class.pi-exclamation-triangle]="!plantUMLServerAvailable()"></i>
              PlantUML {{ plantUMLServerAvailable() ? 'Ready' : 'Offline' }}
            </span>
          </div>
        </div>
        
        <div class="action-section">
          <p-button
            icon="pi pi-bolt"
            size="small"
            severity="secondary"
            (click)="testConnection()"
            [loading]="isTestingConnection()"
            [title]="'Test Connection'">
          </p-button>
          <p-button
            icon="pi pi-cloud-download"
            size="small"
            severity="secondary"
            (click)="loadArchitectures()"
            [loading]="isLoading()"
            [disabled]="!isConnected()"
            [title]="'Load Architectures'">
          </p-button>
          <p-button
            icon="pi pi-sync"
            size="small"
            severity="secondary"
            (click)="reloadModels()"
            [loading]="isReloading()"
            [disabled]="!isConnected()"
            [title]="'Reload Models'">
          </p-button>
        </div>
      </div>

      <div class="main-layout">
        <!-- Left Sidebar -->
        <div class="sidebar">
          <!-- Architecture List -->
          <div class="sidebar-section">
            <div class="section-header">
              <i class="pi pi-building"></i>
              <h3>Architectures</h3>
              <span class="count">{{ architectures().length }}</span>
            </div>
            
            <div class="architecture-list">
              @if (isLoading()) {
                <div class="loading-placeholder">
                  <i class="pi pi-spin pi-spinner"></i>
                  Loading architectures...
                </div>
              } @else if (architectures().length === 0) {
                <div class="empty-placeholder">
                  <i class="pi pi-folder-open"></i>
                  <p>{{ isConnected() ? 'No architectures found' : 'Connect to server first' }}</p>
                </div>
              } @else {
                @for (arch of architectures(); track arch.uid) {
                  <div class="architecture-item" 
                       [class.selected]="selectedArchitecture()?.uid === arch.uid"
                       (click)="selectArchitecture(arch)">
                    <div class="arch-info">
                      <strong>{{ arch.name }}</strong>
                      <span class="version">{{ arch.version || 'v1.0' }}</span>
                    </div>
                    <p-button
                      icon="pi pi-search"
                      size="small"
                      severity="secondary"
                      (click)="$event.stopPropagation(); selectArchitecture(arch)"
                      [disabled]="isAnalyzing()">
                    </p-button>
                  </div>
                }
              }
            </div>
          </div>

          <!-- Architecture Analysis -->
          @if (selectedArchitecture()) {
            <div class="sidebar-section">
              <div class="section-header">
                <i class="pi pi-chart-pie"></i>
                <h3>Analysis</h3>
                @if (analysisData()) {
                  <p-button
                    icon="pi pi-diagram-tree"
                    size="small"
                    (click)="generateDiagram()"
                    [loading]="isGeneratingDiagram()"
                    [title]="'Generate Diagram'">
                  </p-button>
                }
              </div>
              
              <div class="selected-arch">
                <h4>{{ selectedArchitecture()!.name }}</h4>
                @if (selectedArchitecture()!.description) {
                  <p class="description">{{ selectedArchitecture()!.description }}</p>
                }
                
                @if (analysisData()) {
                  <div class="analysis-stats">
                    <div class="stat-group">
                      <h5>Business</h5>
                      <div class="stats">
                        <span>{{ analysisData()!.businessLayer.actorCount }} Actors</span>
                        <span>{{ analysisData()!.businessLayer.serviceCount }} Services</span>
                      </div>
                    </div>
                    
                    <div class="stat-group">
                      <h5>Application</h5>
                      <div class="stats">
                        <span>{{ analysisData()!.applicationLayer.applicationCount }} Apps</span>
                        <span>{{ analysisData()!.applicationLayer.componentCount }} Components</span>
                      </div>
                    </div>
                    
                    <div class="stat-group">
                      <h5>Technology</h5>
                      <div class="stats">
                        <span>{{ analysisData()!.technologyLayer.nodeCount }} Nodes</span>
                        <span>{{ analysisData()!.technologyLayer.serviceCount }} Services</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Main Content Area -->
        <div class="main-content">
          @if (generatedDiagram()) {
            <div class="diagram-section">
              <div class="diagram-header">
                <div class="diagram-info">
                  <h2>{{ selectedArchitecture()?.name || 'Architecture' }} Diagram</h2>
                  @if (diagramStats()) {
                    <div class="element-stats">
                      @if (diagramStats()!.peopleCount) {
                        <span class="stat"><i class="pi pi-user"></i> {{ diagramStats()!.peopleCount }} People</span>
                      }
                      @if (diagramStats()!.systemsCount) {
                        <span class="stat"><i class="pi pi-server"></i> {{ diagramStats()!.systemsCount }} Systems</span>
                      }
                      @if (diagramStats()!.containersCount) {
                        <span class="stat"><i class="pi pi-objects-column"></i> {{ diagramStats()!.containersCount }} Containers</span>
                      }
                    </div>
                  }
                </div>
              </div>
              
              <div class="diagram-content">
                <app-diagram-viewer
                  [plantUMLCode]="generatedDiagram()"
                  [architectureName]="selectedArchitecture()?.name || 'Architecture'"
                  [architectureContext]="architectureContext()">
                </app-diagram-viewer>
              </div>
            </div>
          } @else {
            <div class="welcome-screen">
              <div class="welcome-content">
                <i class="pi pi-palette"></i>
                <h2>Architecture Visualization Studio</h2>
                <p>Select an architecture from the sidebar to generate and visualize C4 diagrams</p>
                
                @if (connectionMessage()) {
                  <div class="connection-status" 
                       [class.success]="isConnected()" 
                       [class.error]="!isConnected()">
                    <i class="pi" [class.pi-check-circle]="isConnected()" [class.pi-exclamation-circle]="!isConnected()"></i>
                    {{ connectionMessage() }}
                  </div>
                }
                
                <div class="quick-actions">
                  @if (!isConnected()) {
                    <p-button
                      label="Test Connection"
                      icon="pi pi-bolt"
                      (click)="testConnection()"
                      [loading]="isTestingConnection()">
                    </p-button>
                  } @else if (architectures().length === 0) {
                    <p-button
                      label="Load Architectures"
                      icon="pi pi-cloud-download"
                      (click)="loadArchitectures()"
                      [loading]="isLoading()">
                    </p-button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--p-surface-ground);
    }

    .header-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--p-surface-0);
      border-bottom: 1px solid var(--p-surface-border);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      z-index: 10;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .title-section i {
      font-size: 1.5rem;
      color: var(--p-primary-color);
    }

    .title-section h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .status-badges {
      display: flex;
      gap: 0.5rem;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.connected {
      background: var(--p-green-50);
      color: var(--p-green-700);
    }

    .status-badge.disconnected {
      background: var(--p-red-50);
      color: var(--p-red-700);
    }

    .status-badge.available {
      background: var(--p-green-50);
      color: var(--p-green-700);
    }

    .status-badge.unavailable {
      background: var(--p-orange-50);
      color: var(--p-orange-700);
    }

    .action-section {
      display: flex;
      gap: 0.5rem;
    }

    .main-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .sidebar {
      width: 350px;
      background: var(--p-surface-0);
      border-right: 1px solid var(--p-surface-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-section {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--p-surface-border);
    }

    .sidebar-section:last-child {
      border-bottom: none;
      flex: 1;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--p-surface-100);
      border-bottom: 1px solid var(--p-surface-border);
    }

    .section-header i {
      color: var(--p-primary-color);
    }

    .section-header h3 {
      margin: 0;
      flex: 1;
      font-size: 1rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .section-header .count {
      background: var(--p-primary-color);
      color: var(--p-primary-contrast-color);
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .architecture-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .architecture-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 0.25rem;
    }

    .architecture-item:hover {
      background: var(--p-surface-100);
    }

    .architecture-item.selected {
      background: var(--p-primary-50);
      border-left: 3px solid var(--p-primary-color);
    }

    .arch-info {
      flex: 1;
      min-width: 0;
    }

    .arch-info strong {
      display: block;
      color: var(--p-text-color);
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .arch-info .version {
      color: var(--p-text-muted-color);
      font-size: 0.75rem;
    }

    .loading-placeholder,
    .empty-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      color: var(--p-text-muted-color);
    }

    .loading-placeholder i,
    .empty-placeholder i {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      opacity: 0.5;
    }

    .selected-arch {
      padding: 1rem;
      overflow-y: auto;
    }

    .selected-arch h4 {
      margin: 0 0 0.5rem 0;
      color: var(--p-text-color);
      font-size: 1rem;
    }

    .selected-arch .description {
      margin: 0 0 1rem 0;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .analysis-stats {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .stat-group h5 {
      margin: 0 0 0.5rem 0;
      color: var(--p-primary-color);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .stat-group .stats {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-group .stats span {
      color: var(--p-text-color);
      font-size: 0.75rem;
      padding: 0.25rem 0;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .diagram-section {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .diagram-header {
      padding: 1rem;
      background: var(--p-surface-0);
      border-bottom: 1px solid var(--p-surface-border);
    }

    .diagram-info h2 {
      margin: 0 0 0.5rem 0;
      color: var(--p-text-color);
      font-size: 1.25rem;
      font-weight: 600;
    }

    .element-stats {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .element-stats .stat {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .element-stats .stat i {
      color: var(--p-primary-color);
    }

    .diagram-content {
      flex: 1;
      overflow: hidden;
    }

    .welcome-screen {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: var(--p-surface-0);
    }

    .welcome-content {
      text-align: center;
      max-width: 500px;
      padding: 2rem;
    }

    .welcome-content i {
      font-size: 4rem;
      color: var(--p-primary-color);
      margin-bottom: 1rem;
      opacity: 0.7;
    }

    .welcome-content h2 {
      margin: 0 0 1rem 0;
      color: var(--p-text-color);
      font-size: 1.5rem;
      font-weight: 600;
    }

    .welcome-content p {
      margin: 0 0 2rem 0;
      color: var(--p-text-muted-color);
      font-size: 1rem;
      line-height: 1.5;
    }

    .connection-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }

    .connection-status.success {
      background: var(--p-green-50);
      color: var(--p-green-700);
    }

    .connection-status.error {
      background: var(--p-red-50);
      color: var(--p-red-700);
    }

    .quick-actions {
      display: flex;
      justify-content: center;
    }

    @media (max-width: 1024px) {
      .sidebar {
        width: 300px;
      }
      
      .status-badges {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .header-toolbar {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .title-section h1 {
        font-size: 1.25rem;
      }

      .main-layout {
        flex-direction: column;
      }

      .sidebar {
        width: 100%;
        max-height: 40vh;
        order: 2;
      }

      .main-content {
        order: 1;
      }
    }
  `]
})
export class ArchitectureDashboardComponent implements OnInit {
  // Signals for reactive state management
  private _architectures = signal<Architecture[]>([]);
  selectedArchitecture = signal<Architecture | null>(null);
  isLoading = signal<boolean>(false);
  isTestingConnection = signal<boolean>(false);
  isReloading = signal<boolean>(false);
  isAnalyzing = signal<boolean>(false);
  isGeneratingDiagram = signal<boolean>(false);
  isConnected = signal<boolean>(false);
  connectionMessage = signal<string>('');
  analysisData = signal<any>(null);
  generatedDiagram = signal<string>('');
  plantUMLServerAvailable = signal<boolean>(false);
  architectureContext = signal<any>(null);

  // Computed values - ensure architectures is always an array
  architectures = computed(() => {
    const archs = this._architectures();
    return Array.isArray(archs) ? archs : [];
  });

  diagramStats = computed(() => {
    const diagram = this.generatedDiagram();
    if (!diagram) return null;

    const peopleCount = (diagram.match(/Person\(/g) || []).length;
    const systemsCount = (diagram.match(/System\(/g) || []).length;
    const containersCount = (diagram.match(/Container\(/g) || []).length;

    return { peopleCount, systemsCount, containersCount };
  });

  constructor(
    private architectureService: ArchitectureService,
    private mappingService: StructurizrMappingService,
    private diagramService: DiagramRenderingService
  ) {}

  ngOnInit() {
    this.testConnection();
    this.checkPlantUMLServer();
  }

  async checkPlantUMLServer() {
    this.diagramService.checkPlantUMLServerAvailability().subscribe({
      next: (available) => {
        this.plantUMLServerAvailable.set(available);
        if (available) {
          console.log('PlantUML server is available at http://localhost:8080');
        } else {
          console.log('PlantUML server not available. Diagrams will show fallback content.');
        }
      },
      error: (error) => {
        console.warn('Failed to check PlantUML server:', error);
        this.plantUMLServerAvailable.set(false);
      }
    });
  }

  async testConnection() {
    this.isTestingConnection.set(true);
    this.connectionMessage.set('Testing connection...');

    try {
      const isConnected = await this.architectureService.testConnection().toPromise();
      this.isConnected.set(isConnected || false);
      this.connectionMessage.set(
        isConnected ? 'Connected to Architecture Engine API' : 'Failed to connect to API server'
      );

      if (isConnected) {
        this.loadArchitectures();
      }
    } catch (error) {
      this.isConnected.set(false);
      this.connectionMessage.set('Connection failed: ' + (error as Error).message);
    } finally {
      this.isTestingConnection.set(false);
    }
  }

  async loadArchitectures() {
    this.isLoading.set(true);

    try {
      const architectures = await this.architectureService.getAllArchitectures().toPromise();

      // Ensure we have a valid array
      if (Array.isArray(architectures)) {
        this._architectures.set(architectures);
        this.connectionMessage.set(`Successfully loaded ${architectures.length} architectures`);
      } else {
        console.warn('Invalid architectures response:', architectures);
        this._architectures.set([]);
        this.connectionMessage.set('Received invalid response from server');
      }
    } catch (error) {
      console.error('Error loading architectures:', error);
      this._architectures.set([]);

      // Better error message based on error type
      let errorMessage = 'Error loading architectures';
      if (error instanceof Error) {
        errorMessage += ': ' + error.message;
      } else if (typeof error === 'string') {
        errorMessage += ': ' + error;
      } else if (error && typeof error === 'object' && 'error' in error) {
        if (error.error instanceof Blob) {
          errorMessage += ': Server returned HTML error page (check if backend is running)';
        } else {
          errorMessage += ': ' + JSON.stringify(error.error);
        }
      }

      this.connectionMessage.set(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  async reloadModels() {
    this.isReloading.set(true);

    try {
      const architectures = await this.architectureService.reloadModels().toPromise();
      if (Array.isArray(architectures)) {
        this._architectures.set(architectures);
        this.connectionMessage.set(`Models reloaded successfully - ${architectures.length} architectures`);
      } else {
        this._architectures.set([]);
        this.connectionMessage.set('Models reloaded but received invalid response');
      }
    } catch (error) {
      console.error('Error reloading models:', error);
      this._architectures.set([]);
      this.connectionMessage.set('Error reloading models: ' + (error as Error).message);
    } finally {
      this.isReloading.set(false);
    }
  }

  async selectArchitecture(architecture: Architecture) {
    this.isAnalyzing.set(true);
    this.selectedArchitecture.set(architecture);
    this.generatedDiagram.set('');

    try {
      // Fetch complete architecture data
      const completeArch = await this.architectureService.getCompleteArchitecture(architecture.uid!).toPromise();

      if (completeArch) {
        // Analyze the architecture data
        const analysis = this.mappingService.analyzeArchitectureData(completeArch);
        this.analysisData.set(analysis);
        this.selectedArchitecture.set(completeArch);
      }
    } catch (error) {
      console.error('Error analyzing architecture:', error);
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  async generateDiagram() {
    const architecture = this.selectedArchitecture();
    if (!architecture) return;

    this.isGeneratingDiagram.set(true);

    try {
      // Map architecture to Structurizr and generate PlantUML
      const context = this.mappingService.mapArchitectureToStructurizr(architecture);
      this.architectureContext.set(context);  // Store context for diagram viewer
      const plantUML = this.mappingService.generateC4PlantUML(context, 'component');

      this.generatedDiagram.set(plantUML);
    } catch (error) {
      console.error('Error generating diagram:', error);
    } finally {
      this.isGeneratingDiagram.set(false);
    }
  }
}
