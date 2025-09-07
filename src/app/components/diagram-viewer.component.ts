import { Component, Input, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { encode } from 'plantuml-encoder';
import { environment } from '../../environments/environment';

// PrimeNG components
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { TabsModule } from 'primeng/tabs';
import { SkeletonModule } from 'primeng/skeleton';
// Using standard HTML textarea instead

import { DiagramService, DiagramTab } from '../services/diagram.service';
import { PlantUMLService, PlantUMLDiagram } from '../renderers/plantuml.service';
import { TrustResourceUrlPipe } from '../pipes/trust-resource-url.pipe';
import { ArchitectureModel } from '../models/architecture.model';
import { DiagramOutput } from '../renderers/base-renderer.interface';
import type { Architecture } from '../../generated/api';

export interface RendererTab {
  id: string;
  name: string;
  label: string;
  icon: string;
  formats: string[];
  currentFormat: string;
  viewMode: 'code' | 'diagram'; // Toggle zwischen Code und Diagramm
  outputs: Map<string, DiagramOutput>; // Format -> DiagramOutput
  editableCode: string;
  plantUMLDiagram?: PlantUMLDiagram; // For PlantUML rendered diagram
  isRendering?: boolean; // Loading state for diagram rendering
  plantUMLDisplayMode?: 'iframe' | 'image'; // PlantUML display mode toggle
}

@Component({
  selector: 'app-diagram-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    MessageModule,
    TabsModule,
    SkeletonModule
  ],
  template: `
    <div class="diagram-viewer-redesigned">
      <!-- Left Panel: Architecture Model -->
      <div class="left-panel">
        <div class="panel-header">
          <h3><i class="pi pi-sitemap"></i> Architecture Model</h3>
          <small>{{ _architectureName() }}</small>
        </div>

        <!-- Analysis Section - At Top -->
        @if (modelAnalysis()) {
          <div class="analysis-section">
            <h4><i class="pi pi-chart-line"></i> Analysis</h4>
            <div class="analysis-grid">
              <div class="analysis-card">
                <span class="metric-value">{{ modelAnalysis().basic?.totalElements || 0 }}</span>
                <span class="metric-label">Elements</span>
              </div>
              <div class="analysis-card">
                <span class="metric-value">{{ modelAnalysis().basic?.relationshipCount || 0 }}</span>
                <span class="metric-label">Relations</span>
              </div>
              <div class="analysis-card">
                <span class="metric-value">{{ rendererTabs().length }}</span>
                <span class="metric-label">Renderers</span>
              </div>
            </div>
          </div>
        }

        <!-- Architecture Details -->
        <div class="model-sections">
          @if (_architecture()?.businessLayer) {
            <div class="model-section">
              <h4><i class="pi pi-users"></i> Business Layer</h4>
              <div class="section-content">
                @if (_architecture()!.businessLayer!.actors?.length) {
                  <div class="subsection">
                    <strong>Actors ({{ _architecture()!.businessLayer!.actors!.length }})</strong>
                    <ul>
                      @for (actor of _architecture()!.businessLayer!.actors!; track actor.uid) {
                        <li>
                          <strong>{{ actor.name }}</strong>
                          <span class="type-badge">{{ actor.actorType }}</span>
                          @if (actor.description) {
                            <p>{{ actor.description }}</p>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }

                @if (_architecture()!.businessLayer!.services?.length) {
                  <div class="subsection">
                    <strong>Services ({{ _architecture()!.businessLayer!.services!.length }})</strong>
                    <ul>
                      @for (service of _architecture()!.businessLayer!.services!; track service.uid) {
                        <li>
                          <strong>{{ service.name }}</strong>
                          @if (service.description) {
                            <p>{{ service.description }}</p>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </div>
          }

          @if (_architecture()?.applicationLayer) {
            <div class="model-section">
              <h4><i class="pi pi-desktop"></i> Application Layer</h4>
              <div class="section-content">

                @if (_architecture()!.applicationLayer!.applications?.length) {
                  <div class="subsection">
                    <strong>Applications ({{ _architecture()!.applicationLayer!.applications!.length }})</strong>
                    <ul>
                      @for (app of _architecture()!.applicationLayer!.applications!; track app.uid) {
                        <li>
                          <strong>{{ app.name }}</strong>
                          @if (app.stereoType) {
                            <span class="type-badge">{{ app.stereoType }}</span>
                          }
                          @if (app.lifecycle) {
                            <span class="type-badge">{{ app.lifecycle }}</span>
                          }
                          @if (app.vendor) {
                            <span class="vendor-badge">{{ app.vendor }}</span>
                          }
                          @if (app.description) {
                            <p>{{ app.description }}</p>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                } @else {
                  <div class="subsection">
                    <strong>Applications (0)</strong>
                    <p class="no-data">No applications found in this layer</p>
                  </div>
                }

                @if (_architecture()!.applicationLayer!.components?.length) {
                  <div class="subsection">
                    <strong>Components ({{ _architecture()!.applicationLayer!.components!.length }})</strong>
                    <ul>
                      @for (comp of _architecture()!.applicationLayer!.components!; track comp.uid) {
                        <li>
                          <strong>{{ comp.name }}</strong>
                          @if (comp.componentType) {
                            <span class="type-badge">{{ comp.componentType }}</span>
                          }
                          @if (comp.technology) {
                            <span class="tech-badge">{{ comp.technology }}</span>
                          }
                          @if (comp.description) {
                            <p>{{ comp.description }}</p>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </div>
          }

          @if (_architecture()?.technologyLayer) {
            <div class="model-section">
              <h4><i class="pi pi-server"></i> Technology Layer</h4>
              <div class="section-content">
                @if (_architecture()!.technologyLayer!.nodes?.length) {
                  <div class="subsection">
                    <strong>Nodes ({{ _architecture()!.technologyLayer!.nodes!.length }})</strong>
                    <ul>
                      @for (node of _architecture()!.technologyLayer!.nodes!; track node.uid) {
                        <li>
                          <strong>{{ node.name }}</strong>
                          @if (node.nodeType) {
                            <span class="type-badge">{{ node.nodeType }}</span>
                          }
                          @if (node.operatingSystem) {
                            <span class="tech-badge">{{ node.operatingSystem }}</span>
                          }
                          @if (node.description) {
                            <p>{{ node.description }}</p>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }

                @if (_architecture()!.technologyLayer!.systemSoftware?.length) {
                  <div class="subsection">
                    <strong>Software ({{ _architecture()!.technologyLayer!.systemSoftware!.length }})</strong>
                    <ul>
                      @for (sw of _architecture()!.technologyLayer!.systemSoftware!; track sw.uid) {
                        <li>
                          <strong>{{ sw.name }}</strong>
                          @if (sw.vendor) {
                            <span class="vendor-badge">{{ sw.vendor }}</span>
                          }
                          @if (sw.version) {
                            <span class="version-badge">v{{ sw.version }}</span>
                          }
                          @if (sw.description) {
                            <p>{{ sw.description }}</p>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </div>
          }

          @if (_architecture()?.relationships?.length) {
            <div class="model-section">
              <h4><i class="pi pi-arrow-right-arrow-left"></i> Relationships</h4>
              <div class="section-content">
                <div class="subsection">
                  <strong>Total: {{ _architecture()!.relationships!.length }}</strong>
                  <div class="relationships-list">
                    @for (rel of _architecture()!.relationships!; track $index) {
                      <div class="relationship-item">
                        <div class="rel-flow">
                          <span class="rel-source">{{ extractElementName(rel.source) }}</span>
                          <i class="pi pi-arrow-right"></i>
                          <span class="rel-target">{{ extractElementName(rel.target) }}</span>
                        </div>
                        <div class="rel-details">
                          @if (rel.relationshipType) {
                            <span class="rel-type">{{ rel.relationshipType }}</span>
                          }
                          @if (rel.description) {
                            <span class="rel-desc">{{ rel.description }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Right Panel: Renderer Tabs -->
      <div class="right-panel">
        <!-- Renderer Tab Navigation -->
        <div class="renderer-tabs">
          @for (tab of rendererTabs(); track tab.id) {
            <button
              class="renderer-tab"
              [class.active]="activeRendererTab() === tab.id"
              (click)="selectRendererTab(tab.id)"
              [title]="tab.label">
              <i [class]="tab.icon"></i>
              <span>{{ tab.label }}</span>
            </button>
          }
        </div>

        <!-- Active Tab Content -->
        @if (getActiveRenderer()) {
          <div class="tab-content">
            <!-- Tab Controls -->
            <div class="tab-controls">
              <!-- View Mode Toggle -->
              <div class="view-toggle">
                <button
                  class="toggle-btn"
                  [class.active]="getActiveRenderer()!.viewMode === 'code'"
                  (click)="setViewMode('code')"
                  title="Show Code">
                  <i class="pi pi-file-edit"></i>
                  Code
                </button>
                <button
                  class="toggle-btn"
                  [class.active]="getActiveRenderer()!.viewMode === 'diagram'"
                  (click)="setViewMode('diagram')"
                  title="Show Diagram">
                  <i class="pi pi-eye"></i>
                  Diagram
                </button>
              </div>

              <!-- Format Selector -->
              <div class="format-selector">
                <label>Format:</label>
                <select
                  [value]="getActiveRenderer()!.currentFormat"
                  (change)="onFormatChange($event)">
                  @for (format of getActiveRenderer()!.formats; track format) {
                    <option [value]="format">{{ format.toUpperCase() }}</option>
                  }
                </select>
              </div>

              <!-- PlantUML Display Mode Toggle -->
              @if (getActiveRenderer()?.name === 'plantuml' && getActiveRenderer()?.viewMode === 'diagram') {
                <div class="display-mode-toggle">
                  <label>Display:</label>
                  <div class="toggle-group">
                    <button
                      class="toggle-option"
                      [class.active]="getActiveRenderer()!.plantUMLDisplayMode !== 'image'"
                      (click)="setPlantUMLDisplayMode('iframe')"
                      title="Show as interactive iframe">
                      <i class="pi pi-window-maximize"></i>
                      Iframe
                    </button>
                    <button
                      class="toggle-option"
                      [class.active]="getActiveRenderer()!.plantUMLDisplayMode === 'image'"
                      (click)="setPlantUMLDisplayMode('image')"
                      title="Show as static image">
                      <i class="pi pi-image"></i>
                      Image
                    </button>
                  </div>
                </div>
              }

              <!-- Action Buttons -->
              <div class="action-buttons">
                <p-button
                  icon="pi pi-clipboard"
                  size="small"
                  severity="secondary"
                  (click)="copyCurrentContent()"
                  title="Copy to Clipboard">
                </p-button>
                <p-button
                  icon="pi pi-download"
                  size="small"
                  severity="secondary"
                  (click)="downloadCurrent()"
                  title="Download">
                </p-button>
                <p-button
                  icon="pi pi-sync"
                  size="small"
                  severity="secondary"
                  (click)="rerenderCurrent()"
                  [loading]="isLoading()"
                  title="Re-render">
                </p-button>
              </div>
            </div>

            <!-- Content Area -->
            <div class="content-area">
              @if (isLoading()) {
                <div class="loading-state">
                  <p-skeleton height="100%" borderRadius="8px"></p-skeleton>
                  <div class="loading-text">
                    <i class="pi pi-spin pi-spinner"></i>
                    Rendering {{ getActiveRenderer()?.label }}...
                  </div>
                </div>
              } @else if (renderError()) {
                <div class="error-state">
                  <p-message severity="warn" [text]="renderError()"></p-message>
                </div>
              } @else if (getActiveRenderer()?.viewMode === 'code') {
                <!-- Code View -->
                <div class="code-view">
                  <textarea
                    class="code-editor"
                    [(ngModel)]="getActiveRenderer()!.editableCode"
                    (ngModelChange)="onCodeEdit()"
                    placeholder="Generated code will appear here...">
                  </textarea>
                </div>
              } @else if (getActiveRenderer()?.viewMode === 'diagram') {
                <!-- Diagram View -->
                <div class="diagram-view">
                  @if (getActiveRenderer()?.name === 'plantuml') {
                    @if (getActiveRenderer()?.isRendering) {
                      <div class="rendering-placeholder">
                        <i class="pi pi-spin pi-spinner"></i>
                        <p>Rendering PlantUML diagram...</p>
                        <small>Connecting to {{ getPlantUMLServerInfo() }}...</small>
                      </div>
                    } @else if (getActiveRenderer()?.plantUMLDiagram?.success) {
                      <!-- Successful PlantUML Rendering with multiple display options -->
                      <div class="plantuml-diagram-container">
                        <!-- Primary display: Iframe for SVG -->
                        @if (getActiveRenderer()!.plantUMLDiagram!.format === 'svg') {
                          <iframe
                            [src]="getActiveRenderer()!.plantUMLDiagram!.safeUrl"
                            class="plantuml-iframe"
                            frameborder="0"
                            title="PlantUML Diagram">
                          </iframe>
                        } @else {
                          <!-- Display mode toggle for non-SVG formats -->
                          @if (getActiveRenderer()!.plantUMLDisplayMode === 'iframe' || !getActiveRenderer()!.plantUMLDisplayMode) {
                            <!-- Iframe display (default) - optimized for SVG -->
                            <iframe
                              [src]="getActiveRenderer()!.plantUMLDiagram!.safeUrl"
                              class="plantuml-iframe"
                              frameborder="0"
                              title="PlantUML Diagram (Interactive)">
                            </iframe>
                            <div class="display-mode-info">
                              <small><i class="pi pi-window-maximize"></i> Interactive iframe ({{ getActiveRenderer()!.plantUMLDiagram!.format.toUpperCase() }})</small>
                            </div>
                          } @else {
                            <!-- Image display - optimized for PNG -->
                            <img
                              [src]="getActiveRenderer()!.plantUMLDiagram!.safeImageUrl"
                              class="plantuml-image"
                              alt="PlantUML Diagram"
                              (load)="onDiagramImageLoad()"
                              (error)="onDiagramImageError($event)">
                            <div class="display-mode-info">
                              <small><i class="pi pi-image"></i> Static image ({{ getActiveRenderer()!.plantUMLDiagram!.format.toUpperCase() }})</small>
                            </div>
                          }
                        }

                        <!-- Diagram info overlay -->
                        <div class="diagram-info">
                          <small>
                            {{ getActiveRenderer()!.plantUMLDiagram!.format.toUpperCase() }} •
                            {{ getActiveRenderer()!.plantUMLDisplayMode || 'iframe' }} •
                            {{ getActiveRenderer()!.plantUMLDiagram!.timestamp | date:'short' }}
                          </small>
                        </div>
                      </div>
                    } @else if (getActiveRenderer()?.plantUMLDiagram?.error) {
                      <!-- Error display with retry option -->
                      <div class="error-placeholder">
                        <i class="pi pi-exclamation-triangle"></i>
                        <p>PlantUML Rendering Failed</p>
                        <small>{{ getActiveRenderer()!.plantUMLDiagram!.error }}</small>
                        <div class="error-actions">
                          <button
                            class="p-button p-button-text"
                            (click)="renderPlantUMLDiagram()">
                            <i class="pi pi-refresh"></i>
                            Retry
                          </button>
                          <button
                            class="p-button p-button-text"
                            (click)="checkPlantUMLServer()">
                            <i class="pi pi-server"></i>
                            Check Server
                          </button>
                        </div>
                      </div>
                    } @else if (getCurrentContent()) {
                      <!-- Ready to render -->
                      <div class="ready-to-render-placeholder">
                        <i class="pi pi-play-circle"></i>
                        <p>Ready to render PlantUML diagram</p>
                        <button
                          class="p-button p-button-outlined"
                          (click)="renderPlantUMLDiagram()">
                          <i class="pi pi-image"></i>
                          Render Diagram
                        </button>
                      </div>
                    } @else {
                      <!-- No content available -->
                      <div class="no-content-placeholder">
                        <i class="pi pi-info-circle"></i>
                        <p>No PlantUML code available</p>
                        <small>Switch to Code view to see the generated content</small>
                      </div>
                    }
                  } @else if (getActiveRenderer()?.name === 'graph') {
                    @if (getCurrentContent()) {
                      <div class="graph-container" id="graph-visualization">
                        <!-- Graph visualization will be rendered here -->
                        <div class="graph-placeholder">
                          <i class="pi pi-share-alt"></i>
                          <p>Interactive graph visualization</p>
                          <small>Content length: {{ getCurrentContent().length }} chars</small>
                        </div>
                      </div>
                    } @else {
                      <div class="no-content-placeholder">
                        <i class="pi pi-info-circle"></i>
                        <p>No graph data available</p>
                        <small>Switch to Code view to see the generated content</small>
                      </div>
                    }
                  } @else {
                    @if (getCurrentContent()) {
                      <div class="text-diagram">
                        <pre class="diagram-code">{{ getCurrentContent() }}</pre>
                      </div>
                    } @else {
                      <div class="no-content-placeholder">
                        <i class="pi pi-info-circle"></i>
                        <p>No diagram content available</p>
                        <small>Try re-rendering or switch to Code view</small>
                      </div>
                    }
                  }
                </div>
              }

              <!-- Metadata -->
              @if (getCurrentOutput()?.metadata) {
                <div class="metadata-info">
                  <small class="metadata-text">
                    Rendered by {{ getCurrentOutput()!.rendererName }}
                    in {{ getCurrentOutput()!.metadata.renderingTime }}ms
                    | {{ getCurrentOutput()!.metadata.elementCount }} elements
                    @if (getCurrentOutput()!.metadata.warnings?.length) {
                      | {{ getCurrentOutput()!.metadata.warnings!.length }} warnings
                    }
                  </small>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .diagram-viewer-redesigned {
      display: flex;
      height: 100%;
      min-height: 600px;
      background: var(--p-surface-ground);
    }

    .left-panel {
      width: 400px;
      min-width: 350px;
      max-width: 500px;
      background: var(--p-surface-0);
      border-right: 1px solid var(--p-surface-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-header {
      padding: 1rem;
      background: var(--p-surface-100);
      border-bottom: 1px solid var(--p-surface-border);
      text-align: center;
    }

    .panel-header h3 {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      color: var(--p-text-color);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .panel-header small {
      color: var(--p-text-muted-color);
      font-size: 0.75rem;
    }

    .analysis-section {
      padding: 1rem;
      background: var(--p-surface-50);
      border-bottom: 1px solid var(--p-surface-border);
    }

    .analysis-section h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--p-primary-color);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .analysis-card {
      text-align: center;
      padding: 0.75rem;
      background: var(--p-surface-0);
      border-radius: 6px;
      border: 1px solid var(--p-surface-border);
    }

    .metric-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--p-primary-color);
    }

    .metric-label {
      display: block;
      font-size: 0.6rem;
      color: var(--p-text-muted-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 0.25rem;
    }

    .model-sections {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .model-section {
      margin-bottom: 1.5rem;
    }

    .model-section h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--p-primary-color);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-content {
      font-size: 0.8rem;
    }

    .subsection {
      margin-bottom: 1rem;
    }

    .subsection strong {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--p-text-color);
    }

    .subsection ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .subsection li {
      padding: 0.5rem;
      margin-bottom: 0.5rem;
      background: var(--p-surface-0);
      border-radius: 4px;
      border-left: 3px solid var(--p-primary-color);
    }

    .subsection li strong {
      display: inline;
      margin: 0;
      font-size: 0.8rem;
    }

    .subsection li p {
      margin: 0.25rem 0 0 0;
      color: var(--p-text-muted-color);
      font-size: 0.75rem;
      line-height: 1.3;
    }

    .type-badge,
    .tech-badge,
    .vendor-badge,
    .version-badge {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      margin-left: 0.25rem;
      border-radius: 12px;
      font-size: 0.6rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .type-badge {
      background: var(--p-primary-100);
      color: var(--p-primary-700);
    }

    .tech-badge {
      background: var(--p-orange-100);
      color: var(--p-orange-700);
    }

    .vendor-badge {
      background: var(--p-blue-100);
      color: var(--p-blue-700);
    }

    .version-badge {
      background: var(--p-green-100);
      color: var(--p-green-700);
    }

    .relationships-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .relationship-item {
      padding: 0.5rem;
      margin-bottom: 0.5rem;
      background: var(--p-surface-0);
      border-radius: 4px;
      border-left: 3px solid var(--p-orange-400);
    }

    .rel-flow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .rel-source,
    .rel-target {
      font-weight: 500;
      color: var(--p-text-color);
      font-size: 0.75rem;
    }

    .rel-details {
      display: flex;
      gap: 0.5rem;
      font-size: 0.7rem;
    }

    .rel-type {
      background: var(--p-orange-100);
      color: var(--p-orange-700);
      padding: 0.125rem 0.375rem;
      border-radius: 8px;
      font-weight: 500;
    }

    .rel-desc {
      color: var(--p-text-muted-color);
    }

    .right-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .renderer-tabs {
      display: flex;
      background: var(--p-surface-0);
      border-bottom: 1px solid var(--p-surface-border);
    }

    .renderer-tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .renderer-tab:hover {
      background: var(--p-surface-100);
      color: var(--p-text-color);
    }

    .renderer-tab.active {
      color: var(--p-primary-color);
      border-bottom-color: var(--p-primary-color);
      background: var(--p-surface-50);
    }

    .renderer-tab i {
      font-size: 1.2rem;
    }

    .tab-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .tab-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--p-surface-50);
      border-bottom: 1px solid var(--p-surface-border);
      gap: 1rem;
    }

    .view-toggle {
      display: flex;
      background: var(--p-surface-0);
      border-radius: 6px;
      padding: 0.25rem;
      border: 1px solid var(--p-surface-border);
    }

    .toggle-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .toggle-btn:hover {
      background: var(--p-surface-100);
      color: var(--p-text-color);
    }

    .toggle-btn.active {
      background: var(--p-primary-color);
      color: var(--p-primary-contrast-color);
    }

    .format-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .format-selector label {
      font-size: 0.875rem;
      color: var(--p-text-color);
      font-weight: 500;
    }

    .format-selector select {
      padding: 0.5rem;
      border: 1px solid var(--p-surface-border);
      border-radius: 4px;
      background: var(--p-surface-0);
      color: var(--p-text-color);
      font-size: 0.875rem;
    }

    .display-mode-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .display-mode-toggle label {
      font-size: 0.875rem;
      color: var(--p-text-color);
      font-weight: 500;
    }

    .toggle-group {
      display: flex;
      background: var(--p-surface-0);
      border-radius: 6px;
      padding: 0.25rem;
      border: 1px solid var(--p-surface-border);
    }

    .toggle-option {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--p-text-muted-color);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .toggle-option:hover {
      background: var(--p-surface-100);
      color: var(--p-text-color);
    }

    .toggle-option.active {
      background: var(--p-primary-color);
      color: var(--p-primary-contrast-color);
    }

    .toggle-option i {
      font-size: 1rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .loading-state {
      flex: 1;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .loading-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .error-state {
      padding: 1rem;
      flex: 1;
    }

    .code-view {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .code-editor {
      flex: 1;
      border: none;
      outline: none;
      padding: 1rem;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      background: var(--p-surface-900);
      color: var(--p-surface-0);
      resize: none;
    }

    .diagram-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .diagram-frame {
      flex: 1;
      border: none;
      background: var(--p-surface-0);
    }

    .graph-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--p-surface-0);
    }

    .graph-placeholder,
    .no-content-placeholder,
    .rendering-placeholder,
    .error-placeholder,
    .ready-to-render-placeholder {
      text-align: center;
      color: var(--p-text-muted-color);
      padding: 2rem;
    }

    .graph-placeholder i,
    .no-content-placeholder i,
    .rendering-placeholder i,
    .error-placeholder i,
    .ready-to-render-placeholder i {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .no-content-placeholder p,
    .rendering-placeholder p,
    .error-placeholder p,
    .ready-to-render-placeholder p {
      margin: 0.5rem 0;
      color: var(--p-text-color);
      font-weight: 500;
    }

    .no-content-placeholder small,
    .rendering-placeholder small,
    .error-placeholder small {
      color: var(--p-text-muted-color);
      font-size: 0.8rem;
      display: block;
      margin-top: 0.5rem;
    }

    .rendering-placeholder .p-button,
    .error-placeholder .p-button,
    .ready-to-render-placeholder .p-button {
      margin-top: 1rem;
      color: var(--p-primary-color);
    }

    .error-placeholder {
      background: var(--p-red-50);
      border: 1px solid var(--p-red-200);
      border-radius: 6px;
    }

    .error-placeholder i {
      color: var(--p-red-500);
    }

    .error-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-top: 1rem;
    }

    .ready-to-render-placeholder {
      background: var(--p-blue-50);
      border: 1px solid var(--p-blue-200);
      border-radius: 6px;
    }

    .ready-to-render-placeholder i {
      color: var(--p-blue-500);
    }

    /* PlantUML specific styles */
    .plantuml-diagram-container {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .plantuml-iframe {
      flex: 1;
      border: none;
      background: var(--p-surface-0);
      min-height: 400px;
    }

    .plantuml-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      background: var(--p-surface-0);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .display-mode-info {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      z-index: 10;
    }

    .display-mode-info i {
      margin-right: 0.25rem;
    }

    .diagram-info {
      position: absolute;
      bottom: 0.5rem;
      right: 0.5rem;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
    }

    .text-diagram {
      flex: 1;
      overflow: auto;
    }

    .diagram-code {
      padding: 1rem;
      margin: 0;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      background: var(--p-surface-900);
      color: var(--p-surface-0);
      white-space: pre;
      overflow: auto;
    }

    .metadata-info {
      padding: 1rem;
      background: var(--p-surface-50);
      border-top: 1px solid var(--p-surface-border);
    }

    .metadata-text {
      color: var(--p-text-muted-color);
      font-size: 0.75rem;
    }

    .debug-info {
      padding: 0.5rem;
      background: var(--p-yellow-50);
      border: 1px solid var(--p-yellow-200);
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .debug-info small {
      color: var(--p-yellow-800);
      font-size: 0.7rem;
    }

    .no-data {
      color: var(--p-text-muted-color);
      font-style: italic;
      font-size: 0.75rem;
      margin: 0.5rem 0;
    }

    @media (max-width: 1024px) {
      .left-panel {
        width: 300px;
      }

      .analysis-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .diagram-viewer-redesigned {
        flex-direction: column;
      }

      .left-panel {
        width: 100%;
        max-height: 40vh;
        order: 2;
      }

      .right-panel {
        order: 1;
      }

      .tab-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .renderer-tab span {
        display: none;
      }
    }
  `]
})
export class DiagramViewerComponent implements OnInit, OnChanges {
  @Input() plantUMLCode: string = '';
  @Input() architectureName: string = 'Architecture';
  @Input() architectureContext?: Architecture;

  // Public signals for template access
  _architectureName = signal<string>('Architecture');
  _architecture = signal<Architecture | null>(null);

  isLoading = signal<boolean>(false);
  renderError = signal<string>('');
  modelAnalysis = signal<any>(null);

  // New structure
  rendererTabs = signal<RendererTab[]>([]);
  activeRendererTab = signal<string>('');

  // Debouncing for code editing
  private codeEditTimeout: any = null;

  constructor(
    private diagramService: DiagramService,
    private plantUMLService: PlantUMLService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this._architectureName.set(this.architectureName);

    if (this.architectureContext) {
      console.log('DiagramViewer: Received architecture context:', this.architectureContext);
      console.log('DiagramViewer: Applications in architecture:', this.architectureContext?.applicationLayer?.applications);
      console.log('DiagramViewer: Components in architecture:', this.architectureContext?.applicationLayer?.components);
      console.log('DiagramViewer: Actors in architecture:', this.architectureContext?.businessLayer?.actors);
      console.log('DiagramViewer: Relationships in architecture:', this.architectureContext?.relationships);

      this._architecture.set(this.architectureContext);
      this.setupRendererTabs();
      this.generateModelAnalysis();
      this.renderAllTabs();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['architectureName']) {
      this._architectureName.set(this.architectureName);
    }

    if (changes['architectureContext'] && this.architectureContext) {
      console.log('DiagramViewer: Architecture context changed:', this.architectureContext);
      console.log('DiagramViewer: New applications data:', this.architectureContext?.applicationLayer?.applications);

      this._architecture.set(this.architectureContext);
      this.setupRendererTabs();
      this.generateModelAnalysis();
      this.renderAllTabs();
    }
  }

  private setupRendererTabs() {
    const renderers = this.diagramService.getRendererRegistry().getAllRenderers();
    const tabs: RendererTab[] = renderers.map(renderer => ({
      id: renderer.name,
      name: renderer.name,
      label: this.capitalize(renderer.name),
      icon: this.getRendererIcon(renderer.name),
      formats: [...renderer.supportedFormats],
      currentFormat: renderer.supportedFormats[0] || 'dsl',
      viewMode: 'diagram',
      outputs: new Map(),
      editableCode: '',
      plantUMLDisplayMode: 'iframe' // Default to iframe display
    }));

    this.rendererTabs.set(tabs);

    if (tabs.length > 0 && !this.activeRendererTab()) {
      this.activeRendererTab.set(tabs[0].id);
    }
  }

  private renderAllTabs() {
    const architecture = this._architecture();
    if (!architecture) return;

    this.isLoading.set(true);
    this.renderError.set('');

    const tabs = this.rendererTabs();
    const renderPromises = tabs.map(tab =>
      this.renderTabFormats(tab, architecture)
    );

    Promise.all(renderPromises).finally(() => {
      this.isLoading.set(false);
    });
  }

  private async renderTabFormats(tab: RendererTab, architecture: Architecture) {
    console.log(`Rendering tab: ${tab.name} with formats:`, tab.formats);

    for (const format of tab.formats) {
      try {
        console.log(`Rendering ${tab.name}-${format}...`);
        const output = await this.diagramService.renderDiagram(
          architecture,
          tab.name,
          format
        ).toPromise();

        if (output) {
          console.log(`Successfully rendered ${tab.name}-${format}:`, {
            contentLength: output.content?.length || 0,
            rendererName: output.rendererName,
            metadata: output.metadata
          });

          tab.outputs.set(format, output);

          // Set editable code for current format
          if (format === tab.currentFormat) {
            tab.editableCode = output.content;
            console.log(`Set editable code for ${tab.name}-${format}:`, output.content?.substring(0, 100) + '...');

            // If this is a PlantUML tab, render the diagram
            if (tab.name === 'plantuml') {
              this.renderPlantUMLForTab(tab);
            }
          }
        } else {
          console.warn(`No output received for ${tab.name}-${format}`);
        }
      } catch (error) {
        console.error(`Failed to render ${tab.name}-${format}:`, error);
        this.renderError.set(`Failed to render ${tab.label}: ${error}`);
      }
    }
  }

  private generateModelAnalysis() {
    const architecture = this._architecture();
    if (!architecture) return;

    try {
      const analysis = this.diagramService.analyzeArchitecture(architecture);
      this.modelAnalysis.set(analysis);
    } catch (error) {
      console.error('Failed to analyze architecture model:', error);
    }
  }

  // Tab management
  selectRendererTab(tabId: string) {
    this.activeRendererTab.set(tabId);
  }

  getActiveRenderer(): RendererTab | null {
    const activeId = this.activeRendererTab();
    return this.rendererTabs().find(tab => tab.id === activeId) || null;
  }

  setViewMode(mode: 'code' | 'diagram') {
    const activeTab = this.getActiveRenderer();
    if (activeTab) {
      activeTab.viewMode = mode;
      this.rendererTabs.set([...this.rendererTabs()]); // Trigger update
    }
  }

  onFormatChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const format = target.value;
    const activeTab = this.getActiveRenderer();

    if (activeTab) {
      activeTab.currentFormat = format;
      const output = activeTab.outputs.get(format);
      if (output) {
        activeTab.editableCode = output.content;

        // Re-render PlantUML diagram when format changes
        if (activeTab.name === 'plantuml') {
          console.log(`Format changed to ${format}, re-rendering PlantUML diagram`);
          this.renderPlantUMLForTab(activeTab);
        }
      }
      this.rendererTabs.set([...this.rendererTabs()]); // Trigger update
    }
  }

  onCodeEdit() {
    const activeTab = this.getActiveRenderer();
    if (!activeTab) return;

    console.log(`Code changed in ${activeTab.name}, preparing to re-render`);

    // Debounce the re-rendering to avoid excessive API calls
    if (this.codeEditTimeout) {
      clearTimeout(this.codeEditTimeout);
    }

    this.codeEditTimeout = setTimeout(() => {
      // Re-render based on the active renderer type
      if (activeTab.name === 'plantuml') {
        console.log('Re-rendering PlantUML diagram after code edit');
        this.renderPlantUMLForTab(activeTab);
      }
      // Add other renderer-specific re-rendering logic here if needed

      this.codeEditTimeout = null;
    }, 1000); // 1-second debounce
  }

  getCurrentOutput(): DiagramOutput | null {
    const activeTab = this.getActiveRenderer();
    if (!activeTab) return null;
    return activeTab.outputs.get(activeTab.currentFormat) || null;
  }

  getCurrentContent(): string {
    const activeTab = this.getActiveRenderer();
    if (!activeTab) return '';
    return activeTab.editableCode || '';
  }

  // Actions
  copyCurrentContent() {
    const content = this.getCurrentContent();
    this.diagramService.copyToClipboard(content);
  }

  downloadCurrent() {
    const activeTab = this.getActiveRenderer();
    const content = this.getCurrentContent();
    if (!activeTab || !content) return;

    const filename = `${this._architectureName()}-${activeTab.name}-${activeTab.currentFormat}.txt`;
    this.diagramService.exportDiagram(content, activeTab.currentFormat, filename);
  }

  rerenderCurrent() {
    const activeTab = this.getActiveRenderer();
    const architecture = this._architecture();
    if (!activeTab || !architecture) return;

    this.renderTabFormats(activeTab, architecture);
  }

  extractElementName(source: any): string {
    if (typeof source === 'string') return source;
    if (source && source.name) return source.name;
    if (source && source.uid) return source.uid;
    return 'Unknown';
  }

  renderPlantUMLDiagram(): void {
    const activeTab = this.getActiveRenderer();
    if (activeTab?.name === 'plantuml') {
      this.renderPlantUMLForTab(activeTab);
    }
  }

  checkPlantUMLServer(): void {
    console.log('Checking PlantUML server availability...');
    this.plantUMLService.checkServerAvailability().subscribe({
      next: (available) => {
        console.log('PlantUML server available:', available);
        if (available) {
          this.renderPlantUMLDiagram();
        }
      },
      error: (error) => {
        console.error('PlantUML server check failed:', error);
        this.renderError.set(`Server check failed: ${error.message}`);
      }
    });
  }

  getPlantUMLServerInfo(): string {
    return this.plantUMLService.getServerConfig().url;
  }

  onDiagramImageLoad(): void {
    console.log('PlantUML diagram image loaded successfully');
  }

  onDiagramImageError(event: any): void {
    console.error('PlantUML diagram image failed to load:', event);
    const activeTab = this.getActiveRenderer();
    if (activeTab) {
      activeTab.plantUMLDiagram = {
        ...activeTab.plantUMLDiagram!,
        success: false,
        error: 'Failed to load diagram image'
      };
      this.rendererTabs.set([...this.rendererTabs()]);
    }
  }

  private renderPlantUMLForTab(tab: RendererTab): void {
    const displayMode = tab.plantUMLDisplayMode || 'iframe';
    this.renderPlantUMLForTabWithMode(tab, displayMode);
  }

  private renderPlantUMLForTabWithMode(tab: RendererTab, displayMode: 'iframe' | 'image'): void {
    if (!tab.editableCode) {
      console.warn('No PlantUML code available for rendering');
      return;
    }

    console.log(`Rendering PlantUML diagram for tab: ${tab.name} in ${displayMode} mode`);

    // Set loading state
    tab.isRendering = true;
    this.rendererTabs.set([...this.rendererTabs()]);

    // Choose optimal format based on display mode
    const format = displayMode === 'image' ? 'png' : 'svg';
    const renderOptions = {
      format: format as any,
      timeout: 15000,
      useCache: false // Always reload when switching modes
    };

    console.log(`Using format ${format} for ${displayMode} rendering`);

    this.plantUMLService.renderDiagram(tab.editableCode, renderOptions).subscribe({
      next: (plantUMLDiagram) => {
        console.log(`PlantUML diagram rendered successfully in ${displayMode} mode:`, {
          format: plantUMLDiagram.format,
          success: plantUMLDiagram.success,
          hasBlob: !!plantUMLDiagram.blob,
          displayMode: displayMode
        });

        // Enhance diagram object with display mode info
        tab.plantUMLDiagram = {
          ...plantUMLDiagram,
          displayMode: displayMode
        } as any;

        tab.isRendering = false;
        this.rendererTabs.set([...this.rendererTabs()]); // Trigger update

        // Clear any previous errors
        this.renderError.set('');
      },
      error: (error) => {
        console.error(`Failed to render PlantUML diagram in ${displayMode} mode:`, error);
        tab.plantUMLDiagram = {
          code: tab.editableCode,
          encodedUrl: '',
          safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(''),
          format: format as any,
          success: false,
          error: `${displayMode} rendering failed: ${error.message}`,
          timestamp: new Date(),
          displayMode: displayMode
        } as any;
        tab.isRendering = false;
        this.rendererTabs.set([...this.rendererTabs()]);
        this.renderError.set(`Failed to render PlantUML in ${displayMode} mode: ${error.message}`);
      }
    });
  }

  // Utilities
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getRendererIcon(rendererName: string): string {
    const icons: Record<string, string> = {
      'plantuml': 'pi pi-sitemap',
      'graph': 'pi pi-share-alt',
      'structurizr': 'pi pi-objects-column',
      'likec4': 'pi pi-diagram-tree'
    };
    return icons[rendererName] || 'pi pi-file';
  }

  setPlantUMLDisplayMode(mode: 'iframe' | 'image') {
    const activeTab = this.getActiveRenderer();
    if (activeTab?.name === 'plantuml') {
      const previousMode = activeTab.plantUMLDisplayMode;
      activeTab.plantUMLDisplayMode = mode;

      console.log(`PlantUML display mode changed from ${previousMode} to: ${mode}`);

      // Clear existing diagram to force reload
      activeTab.plantUMLDiagram = undefined;

      // Set appropriate format for the display mode
      const optimizedFormat = mode === 'image' ? 'png' : 'svg';
      if (activeTab.currentFormat !== optimizedFormat && activeTab.formats.includes(optimizedFormat)) {
        activeTab.currentFormat = optimizedFormat;
        const output = activeTab.outputs.get(optimizedFormat);
        if (output) {
          activeTab.editableCode = output.content;
        }
        console.log(`Format automatically changed to ${optimizedFormat} for ${mode} display`);
      }

      // Trigger re-render with the new display mode
      this.renderPlantUMLForTabWithMode(activeTab, mode);

      this.rendererTabs.set([...this.rendererTabs()]); // Trigger update
    }
  }
}

