import type {
  Architecture,
  BusinessLayer,
  ApplicationLayer,
  TechnologyLayer,
  Relationship,
  BusinessActor,
  BusinessService,
  BusinessCapability,
  BusinessDomain,
  BusinessProcess,
  Application,
  ApplicationComponent,
  ApplicationService,
  ApplicationInterface,
  TechnologyNode,
  TechnologyService,
  TechnologyInterface,
  SystemSoftware,
  Artifact
} from '../../generated/api';

// Core Architecture Model - based on OpenAPI specification
export interface ArchitectureModel extends Architecture {
  uid: string;
  name: string;
  description: string;
  version?: string;
  businessLayer?: BusinessLayer;
  applicationLayer?: ApplicationLayer;
  technologyLayer?: TechnologyLayer;
  relationships?: Relationship[];
  metadata?: Record<string, any>;
}

// Enhanced element interfaces for better type safety
export interface ArchitectureElement {
  uid: string;
  name: string;
  description?: string;
  documentation?: string;
  properties?: Record<string, string>;
}

export interface BusinessElement extends ArchitectureElement {
  layer: 'business';
}

export interface ApplicationElement extends ArchitectureElement {
  layer: 'application';
}

export interface TechnologyElement extends ArchitectureElement {
  layer: 'technology';
}

// Relationship types with enhanced typing
export interface ArchitectureRelationship {
  source: string;
  target: string;
  description?: string;
  relationshipType?: RelationshipType;
  flowType?: FlowType;
  properties?: Record<string, string>;
}

export type RelationshipType = 
  | 'FLOW' 
  | 'SERVING' 
  | 'ACCESS' 
  | 'TRIGGERING' 
  | 'COMPOSITION' 
  | 'AGGREGATION' 
  | 'ASSOCIATION';

export type FlowType = 
  | 'SYNCHRONOUS' 
  | 'ASYNCHRONOUS' 
  | 'REQUEST_RESPONSE' 
  | 'EVENT';

// Validation result interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  elementId?: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  elementId?: string;
  severity: 'warning';
}

// Layer analysis interfaces
export interface LayerAnalysis {
  businessLayer: {
    actorCount: number;
    serviceCount: number;
    capabilityCount: number;
    domainCount: number;
    processCount: number;
  };
  applicationLayer: {
    applicationCount: number;
    componentCount: number;
    serviceCount: number;
    interfaceCount: number;
  };
  technologyLayer: {
    nodeCount: number;
    serviceCount: number;
    artifactCount: number;
    interfaceCount: number;
    systemSoftwareCount: number;
  };
  relationshipCount: number;
  totalElements: number;
}

// Helper functions for model analysis
export class ArchitectureModelAnalyzer {
  static analyze(model: ArchitectureModel): LayerAnalysis {
    return {
      businessLayer: {
        actorCount: model.businessLayer?.actors?.length || 0,
        serviceCount: model.businessLayer?.services?.length || 0,
        capabilityCount: model.businessLayer?.capabilities?.length || 0,
        domainCount: model.businessLayer?.domains?.length || 0,
        processCount: model.businessLayer?.processes?.length || 0
      },
      applicationLayer: {
        applicationCount: model.applicationLayer?.applications?.length || 0,
        componentCount: model.applicationLayer?.components?.length || 0,
        serviceCount: model.applicationLayer?.services?.length || 0,
        interfaceCount: model.applicationLayer?.interfaces?.length || 0
      },
      technologyLayer: {
        nodeCount: model.technologyLayer?.nodes?.length || 0,
        serviceCount: model.technologyLayer?.services?.length || 0,
        artifactCount: model.technologyLayer?.artifacts?.length || 0,
        interfaceCount: model.technologyLayer?.interfaces?.length || 0,
        systemSoftwareCount: model.technologyLayer?.systemSoftware?.length || 0
      },
      relationshipCount: model.relationships?.length || 0,
      totalElements: this.calculateTotalElements(model)
    };
  }

  private static calculateTotalElements(model: ArchitectureModel): number {
    const business = (model.businessLayer?.actors?.length || 0) +
                    (model.businessLayer?.services?.length || 0) +
                    (model.businessLayer?.capabilities?.length || 0) +
                    (model.businessLayer?.domains?.length || 0) +
                    (model.businessLayer?.processes?.length || 0);

    const application = (model.applicationLayer?.applications?.length || 0) +
                       (model.applicationLayer?.components?.length || 0) +
                       (model.applicationLayer?.services?.length || 0) +
                       (model.applicationLayer?.interfaces?.length || 0);

    const technology = (model.technologyLayer?.nodes?.length || 0) +
                      (model.technologyLayer?.services?.length || 0) +
                      (model.technologyLayer?.artifacts?.length || 0) +
                      (model.technologyLayer?.interfaces?.length || 0) +
                      (model.technologyLayer?.systemSoftware?.length || 0);

    return business + application + technology;
  }

  static validate(model: ArchitectureModel): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation rules
    if (!model.uid) {
      errors.push({
        code: 'MISSING_UID',
        message: 'Architecture model must have a unique identifier',
        severity: 'error'
      });
    }

    if (!model.name) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Architecture model must have a name',
        severity: 'error'
      });
    }

    // Validate relationships
    model.relationships?.forEach((rel, index) => {
      if (!rel.source) {
        errors.push({
          code: 'MISSING_SOURCE',
          message: `Relationship ${index} is missing source element`,
          severity: 'error'
        });
      }
      if (!rel.target) {
        errors.push({
          code: 'MISSING_TARGET',
          message: `Relationship ${index} is missing target element`,
          severity: 'error'
        });
      }
    });

    // Check for empty layers
    const analysis = this.analyze(model);
    if (analysis.totalElements === 0) {
      warnings.push({
        code: 'EMPTY_MODEL',
        message: 'Architecture model contains no elements',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Type guards for layer elements
export function isBusinessActor(element: any): element is BusinessActor {
  return element && typeof element === 'object' && 'actorType' in element;
}

export function isApplication(element: any): element is Application {
  return element && typeof element === 'object' && 'stereoType' in element;
}

export function isTechnologyNode(element: any): element is TechnologyNode {
  return element && typeof element === 'object' && 'nodeType' in element;
}