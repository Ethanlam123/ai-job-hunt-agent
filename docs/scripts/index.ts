/**
 * Documentation Automation Scripts Index
 *
 * This file exports all documentation automation functionality
 * for easy imports and use throughout the project.
 */

export { DocumentationGenerator } from './documentation-generator'
export { DocumentationCoverageChecker } from './docs-coverage-checker'

// Re-export main functions for convenience
export async function generateAllDocumentation() {
  const generator = new DocumentationGenerator()
  return await generator.generateAllDocumentation()
}

export async function checkDocumentationCoverage() {
  const checker = new DocumentationCoverageChecker()
  return await checker.checkCoverage()
}