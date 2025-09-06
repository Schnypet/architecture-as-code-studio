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
    <div class="architecture-dashboard">
      <p-card class="mb-3">
        <ng-template pTemplate="header">
          <div class="flex align-items-center gap-2">
            <i class="pi pi-sitemap" style="font-size: 1.5rem;"></i>
            <span>Architecture as Code Studio</span>
          </div>
        </ng-template>
        <p class="text-lg">Welcome to the Architecture Studio - analyze and visualize your architecture models</p>

        <div class="flex gap-2 mt-3">
          <p-button
            label="Test Connection"
            icon="pi pi-wifi"
            (click)="testConnection()"
            [loading]="isTestingConnection()"
            severity="secondary">
          </p-button>

          <p-button
            label="Load Architectures"
            icon="pi pi-download"
            (click)="loadArchitectures()"
            [loading]="isLoading()"
            [disabled]="!isConnected()">
          </p-button>

          <p-button
            label="Reload Models"
            icon="pi pi-refresh"
            (click)="reloadModels()"
            [loading]="isReloading()"
            [disabled]="!isConnected()">
          </p-button>

        </div>

        <div class="mt-3">
          <p-message
            *ngIf="connectionMessage()"
            [severity]="isConnected() ? 'success' : 'error'"
            [text]="connectionMessage()">
          </p-message>

          <p-message
            *ngIf="!plantUMLServerAvailable()"
            severity="info"
            class="mt-2">
            <div>
              <strong>PlantUML Server Not Available</strong><br>
              To render visual diagrams, start a PlantUML server:<br>
              <code>docker run -d -p 8080:8080 plantuml/plantuml-server:jetty</code>
            </div>
          </p-message>

          <p-message
            *ngIf="plantUMLServerAvailable()"
            severity="success"
            class="mt-2">
            <div>
              <strong>PlantUML Server Available</strong><br>
              Diagrams will render as visual images
            </div>
          </p-message>
        </div>
      </p-card>

      <div class="grid">
        <!-- Architecture List -->
        <div class="col-12 lg:col-6">
          <p-card>
            <ng-template pTemplate="header">
              <div class="flex align-items-center gap-2">
                <i class="pi pi-list" style="font-size: 1.25rem;"></i>
                <span>Available Architectures</span>
              </div>
            </ng-template>
            <p-table
              [value]="architectures()"
              [loading]="isLoading()"
              dataKey="uid"
              class="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr>
                  <th>Name</th>
                  <th>Version</th>
                  <th>Actions</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-arch>
                <tr>
                  <td>{{ arch.name }}</td>
                  <td>{{ arch.version || 'N/A' }}</td>
                  <td>
                    <p-button
                      icon="pi pi-eye"
                      size="small"
                      severity="secondary"
                      (click)="selectArchitecture(arch)"
                      [disabled]="isAnalyzing()">
                    </p-button>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="3" class="text-center">
                    {{ isConnected() ? 'No architectures found' : 'Connect to server to load architectures' }}
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>

        <!-- Architecture Analysis -->
        <div class="col-12 lg:col-6">
          <p-card *ngIf="selectedArchitecture()">
            <ng-template pTemplate="header">
              <div class="flex align-items-center gap-2">
                <i class="pi pi-chart-bar" style="font-size: 1.25rem;"></i>
                <span>Architecture Analysis</span>
              </div>
            </ng-template>
            <div class="mb-3">
              <h4 class="mt-0">{{ selectedArchitecture()?.name }}</h4>
              <p class="text-sm text-600">{{ selectedArchitecture()?.description }}</p>
            </div>

            <div class="analysis-grid" *ngIf="analysisData()">
              <div class="analysis-section">
                <h5>Business Layer</h5>
                <ul class="list-none p-0">
                  <li>Actors: <strong>{{ analysisData()?.businessLayer.actorCount }}</strong></li>
                  <li>Domains: <strong>{{ analysisData()?.businessLayer.domainCount }}</strong></li>
                  <li>Processes: <strong>{{ analysisData()?.businessLayer.processCount }}</strong></li>
                  <li>Services: <strong>{{ analysisData()?.businessLayer.serviceCount }}</strong></li>
                </ul>
              </div>

              <div class="analysis-section">
                <h5>Application Layer</h5>
                <ul class="list-none p-0">
                  <li>Applications: <strong>{{ analysisData()?.applicationLayer.applicationCount }}</strong></li>
                  <li>Components: <strong>{{ analysisData()?.applicationLayer.componentCount }}</strong></li>
                  <li>Services: <strong>{{ analysisData()?.applicationLayer.serviceCount }}</strong></li>
                  <li>Interfaces: <strong>{{ analysisData()?.applicationLayer.interfaceCount }}</strong></li>
                </ul>
              </div>

              <div class="analysis-section">
                <h5>Technology Layer</h5>
                <ul class="list-none p-0">
                  <li>Nodes: <strong>{{ analysisData()?.technologyLayer.nodeCount }}</strong></li>
                  <li>Services: <strong>{{ analysisData()?.technologyLayer.serviceCount }}</strong></li>
                  <li>Artifacts: <strong>{{ analysisData()?.technologyLayer.artifactCount }}</strong></li>
                </ul>
              </div>
            </div>

            <div class="mt-3">
              <p-button
                label="Generate C4 Diagram"
                icon="pi pi-image"
                (click)="generateDiagram()"
                [loading]="isGeneratingDiagram()"
                [disabled]="!selectedArchitecture()">
              </p-button>
            </div>
          </p-card>
        </div>
      </div>

      <!-- C4 Diagram Visualization -->
      <div class="col-12" *ngIf="generatedDiagram()">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center gap-2">
              <i class="pi pi-image" style="font-size: 1.25rem;"></i>
              <span>C4 System Context Diagram</span>
            </div>
          </ng-template>

          <div class="mb-3">
            <p class="text-600">
              <strong>Elements found:</strong>
              <span *ngIf="diagramStats()?.peopleCount"> People: {{ diagramStats()?.peopleCount }}</span>
              <span *ngIf="diagramStats()?.systemsCount"> • Systems: {{ diagramStats()?.systemsCount }}</span>
              <span *ngIf="diagramStats()?.containersCount"> • Containers: {{ diagramStats()?.containersCount }}</span>
            </p>
          </div>

          <app-diagram-viewer
            [plantUMLCode]="generatedDiagram()"
            [architectureName]="selectedArchitecture()?.name || 'Architecture'"
            [architectureContext]="architectureContext()">
          </app-diagram-viewer>
        </p-card>
      </div>
    </div>
  `,
  styles: []
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
