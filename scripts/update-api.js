#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the environment configuration
const envPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
const envContent = fs.readFileSync(envPath, 'utf8');

// Extract the API base URL from the environment file
const apiBaseUrlMatch = envContent.match(/apiBaseUrl:\s*['"`]([^'"`]+)['"`]/);
const apiBaseUrl = apiBaseUrlMatch ? apiBaseUrlMatch[1] : 'http://localhost:8080';

console.log(`🔄 Updating API specification from: ${apiBaseUrl}`);

try {
  // Fetch the OpenAPI specification
  const apiSpecUrl = `${apiBaseUrl}/v3/api-docs`;
  execSync(`curl -s ${apiSpecUrl} | jq '.' > api/openapi.json`, { stdio: 'inherit' });
  
  console.log('✅ OpenAPI specification updated successfully');
  
  // Generate the TypeScript client
  console.log('🔧 Generating TypeScript client...');
  execSync('npm run generate-api', { stdio: 'inherit' });
  
  console.log('✅ API client generation completed successfully');
} catch (error) {
  console.error('❌ Failed to update API:', error.message);
  process.exit(1);
}