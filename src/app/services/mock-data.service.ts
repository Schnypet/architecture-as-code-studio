import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Architecture } from '../../generated/api';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {

  /**
   * Mock architecture data for testing visualization
   */
  getMockArchitecture(): Observable<Architecture> {
    const mockArchitecture: Architecture = {
      uid: 'arch-001',
      name: 'E-Commerce System Architecture',
      description: 'Comprehensive e-commerce platform architecture',
      version: '1.0.0',
      businessLayer: {
        actors: [
          {
            uid: 'customer',
            name: 'Customer',
            description: 'End user who purchases products',
            actorType: 'EXTERNAL'
          },
          {
            uid: 'admin',
            name: 'System Administrator',
            description: 'Manages the e-commerce platform',
            actorType: 'INTERNAL'
          },
          {
            uid: 'supplier',
            name: 'Product Supplier',
            description: 'Provides products to the platform',
            actorType: 'EXTERNAL'
          }
        ],
        domains: [],
        processes: [],
        services: [],
        capabilities: []
      },
      applicationLayer: {
        applications: [
          {
            uid: 'ecommerce-app',
            name: 'E-Commerce Application',
            description: 'Main customer-facing application',
            stereoType: 'IT_APPLICATION',
            lifecycle: 'ACTIVE'
          },
          {
            uid: 'admin-portal',
            name: 'Admin Portal',
            description: 'Administrative interface for managing the system',
            stereoType: 'IT_APPLICATION',
            lifecycle: 'ACTIVE'
          },
          {
            uid: 'payment-service',
            name: 'Payment Service',
            description: 'Handles payment processing',
            stereoType: 'MICROSOLUTION',
            lifecycle: 'ACTIVE'
          }
        ],
        components: [
          {
            uid: 'web-frontend',
            name: 'Web Frontend',
            description: 'React-based customer interface',
            technology: 'React.js',
            componentType: 'FRONTEND'
          },
          {
            uid: 'api-gateway',
            name: 'API Gateway',
            description: 'Central entry point for all API requests',
            technology: 'Kong',
            componentType: 'INTEGRATION'
          },
          {
            uid: 'order-service',
            name: 'Order Service',
            description: 'Manages customer orders',
            technology: 'Spring Boot',
            componentType: 'BACKEND'
          },
          {
            uid: 'inventory-service',
            name: 'Inventory Service',
            description: 'Tracks product inventory',
            technology: 'Node.js',
            componentType: 'BACKEND'
          },
          {
            uid: 'user-service',
            name: 'User Service',
            description: 'Manages user accounts and authentication',
            technology: 'Spring Boot',
            componentType: 'BACKEND'
          },
          {
            uid: 'notification-service',
            name: 'Notification Service',
            description: 'Sends notifications to users',
            technology: 'Python',
            componentType: 'BACKEND'
          },
          {
            uid: 'user-database',
            name: 'User Database',
            description: 'Stores user accounts and authentication data',
            technology: 'PostgreSQL',
            componentType: 'DATABASE'
          },
          {
            uid: 'product-database',
            name: 'Product Database',
            description: 'Stores product catalog and inventory data',
            technology: 'MongoDB',
            componentType: 'DATABASE'
          },
          {
            uid: 'order-database',
            name: 'Order Database',
            description: 'Stores order history and transaction data',
            technology: 'PostgreSQL',
            componentType: 'DATABASE'
          }
        ],
        services: [],
        interfaces: []
      },
      technologyLayer: {
        nodes: [],
        services: [],
        artifacts: [],
        interfaces: [],
        systemSoftware: []
      },
      relationships: [
        {
          uid: 'rel-001',
          source: { uid: 'customer' },
          target: { uid: 'ecommerce-app' },
          description: 'Uses the e-commerce platform',
          relationshipType: 'SERVING',
          flowType: 'INFORMATION'
        },
        {
          uid: 'rel-002',
          source: { uid: 'admin' },
          target: { uid: 'admin-portal' },
          description: 'Manages the system',
          relationshipType: 'SERVING',
          flowType: 'CONTROL'
        },
        {
          uid: 'rel-003',
          source: { uid: 'ecommerce-app' },
          target: { uid: 'payment-service' },
          description: 'Processes payments',
          relationshipType: 'FLOW',
          flowType: 'DATA',
          properties: { 'technology': 'HTTPS/REST' }
        },
        {
          uid: 'rel-004',
          source: { uid: 'web-frontend' },
          target: { uid: 'api-gateway' },
          description: 'Makes API requests',
          relationshipType: 'FLOW',
          flowType: 'DATA',
          properties: { 'technology': 'HTTP/REST' }
        },
        {
          uid: 'rel-005',
          source: { uid: 'api-gateway' },
          target: { uid: 'order-service' },
          description: 'Routes order requests',
          relationshipType: 'FLOW',
          flowType: 'DATA'
        },
        {
          uid: 'rel-006',
          source: { uid: 'api-gateway' },
          target: { uid: 'inventory-service' },
          description: 'Routes inventory requests',
          relationshipType: 'FLOW',
          flowType: 'DATA'
        },
        {
          uid: 'rel-007',
          source: { uid: 'order-service' },
          target: { uid: 'inventory-service' },
          description: 'Checks inventory availability',
          relationshipType: 'ACCESS',
          flowType: 'DATA'
        },
        {
          uid: 'rel-008',
          source: { uid: 'order-service' },
          target: { uid: 'notification-service' },
          description: 'Triggers order notifications',
          relationshipType: 'TRIGGERING',
          flowType: 'EVENT'
        },
        {
          uid: 'rel-009',
          source: { uid: 'user-service' },
          target: { uid: 'user-database' },
          description: 'Stores and retrieves user data',
          relationshipType: 'ACCESS',
          flowType: 'DATA',
          properties: { 'technology': 'JDBC' }
        },
        {
          uid: 'rel-010',
          source: { uid: 'inventory-service' },
          target: { uid: 'product-database' },
          description: 'Manages product inventory',
          relationshipType: 'ACCESS',
          flowType: 'DATA',
          properties: { 'technology': 'MongoDB Driver' }
        },
        {
          uid: 'rel-011',
          source: { uid: 'order-service' },
          target: { uid: 'order-database' },
          description: 'Persists order data',
          relationshipType: 'ACCESS',
          flowType: 'DATA',
          properties: { 'technology': 'JDBC' }
        }
      ]
    };

    return of(mockArchitecture);
  }

  /**
   * Mock list of architectures
   */
  getMockArchitectureList(): Observable<Architecture[]> {
    return of([
      {
        uid: 'arch-001',
        name: 'E-Commerce System Architecture',
        description: 'Comprehensive e-commerce platform architecture',
        version: '1.0.0'
      },
      {
        uid: 'arch-002', 
        name: 'Banking System Architecture',
        description: 'Core banking system architecture',
        version: '2.1.0'
      }
    ]);
  }
}