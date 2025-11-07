#!/usr/bin/env npx tsx

/**
 * Documentation Automation Generator
 *
 * This script automatically generates and maintains project documentation
 * by analyzing the codebase and extracting relevant information.
 */

import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises'
import { join, basename } from 'path'

// Note: Interface definitions kept for future extensibility
// interface DocumentedFunction {
//   name: string
//   description: string
//   parameters: Parameter[]
//   returnType: string
//   filePath: string
//   lineNumber: number
// }

// interface Parameter {
//   name: string
//   type: string
//   description?: string
//   optional: boolean
// }

// interface ComponentDocumentation {
//   name: string
//   description: string
//   props: Prop[]
//   examples: string[]
//   filePath: string
// }

// Note: Prop interface kept for future extensibility
// interface Prop {
//   name: string
//   type: string
//   required: boolean
//   description?: string
// }

class DocumentationGenerator {
  private readonly projectRoot: string
  private readonly docsDir: string

  constructor() {
    this.projectRoot = process.cwd()
    this.docsDir = join(this.projectRoot, 'docs')
  }

  async generateAllDocumentation(): Promise<void> {
    console.log('🚀 Starting documentation generation...')

    try {
      await this.ensureDocsDirectory()
      await this.generateAPIDocumentation()
      await this.generateComponentDocumentation()
      await this.generateDatabaseSchemaDocumentation()
      await this.generateEnvironmentVariablesDocumentation()
      await this.updateMainReadme()
      await this.validateDocumentation()

      console.log('✅ Documentation generation completed successfully!')
    } catch (error) {
      console.error('❌ Documentation generation failed:', error)
      process.exit(1)
    }
  }

  private async ensureDocsDirectory(): Promise<void> {
    try {
      await stat(this.docsDir)
    } catch {
      console.log('📁 Creating docs directory...')
      await this.createDocsDirectories()
    }
  }

  private async createDocsDirectories(): Promise<void> {
    const directories = [
      join(this.docsDir, 'api'),
      join(this.docsDir, 'components'),
      join(this.docsDir, 'database')
    ]

    for (const dir of directories) {
      try {
        await mkdir(dir, { recursive: true })
      } catch (error) {
        console.warn(`⚠️ Could not create directory ${dir}:`, error)
      }
    }
  }

  private async generateAPIDocumentation(): Promise<void> {
    console.log('📝 Generating API documentation...')

    const actionsDir = join(this.projectRoot, 'src/actions')
    const serverActions = await this.findServerActions(actionsDir)

    let apiDoc = `# API Documentation - Server Actions\n\n`
    apiDoc += `> Auto-generated on ${new Date().toISOString()}\n\n`
    apiDoc += `This document contains all Server Actions available in the application.\n\n`

    for (const action of serverActions) {
      apiDoc += await this.generateServerActionDoc(action)
    }

    await writeFile(join(this.docsDir, 'api', 'server-actions.md'), apiDoc)
  }

  private async generateComponentDocumentation(): Promise<void> {
    console.log('🧩 Generating component documentation...')

    const componentsDir = join(this.projectRoot, 'src/components')
    const components = await this.findComponents(componentsDir)

    let componentDoc = `# Component Documentation\n\n`
    componentDoc += `> Auto-generated on ${new Date().toISOString()}\n\n`
    componentDoc += `This document contains all React components and their props.\n\n`

    for (const component of components) {
      componentDoc += await this.generateComponentDoc(component)
    }

    await writeFile(join(this.docsDir, 'components', 'index.md'), componentDoc)
  }

  private async generateDatabaseSchemaDocumentation(): Promise<void> {
    console.log('🗄️ Generating database schema documentation...')

    const schemaPath = join(this.projectRoot, 'src/lib/db/schema.ts')

    try {
      const schemaContent = await readFile(schemaPath, 'utf-8')

      // Extract table definitions using regex
      const tableRegex = /export const (\w+) = pgTable\('(\w+)'[^{]*\{([\s\S]*?)\}\)/g
      const tables = []
      let match

      while ((match = tableRegex.exec(schemaContent)) !== null) {
        const [, tableName, actualName, tableDefinition] = match
        tables.push({
          name: tableName,
          actualName,
          definition: tableDefinition.trim()
        })
      }

      let schemaDoc = `# Database Schema Documentation\n\n`
      schemaDoc += `> Auto-generated on ${new Date().toISOString()}\n\n`
      schemaDoc += `This document contains all database tables and their columns.\n\n`

      for (const table of tables) {
        schemaDoc += await this.generateTableDoc(table)
      }

      await writeFile(join(this.docsDir, 'database', 'schema.md'), schemaDoc)
    } catch (error) {
      console.warn('⚠️ Could not generate database schema documentation:', error)
    }
  }

  private async generateEnvironmentVariablesDocumentation(): Promise<void> {
    console.log('🔧 Generating environment variables documentation...')

    const envExamplePath = join(this.projectRoot, '.env.example')
    let envContent = ''

    try {
      envContent = await readFile(envExamplePath, 'utf-8')
    } catch {
      console.warn('⚠️ .env.example file not found')
      return
    }

    const variables = envContent
      .split('\n')
      .filter(line => line.startsWith('#') === false && line.includes('='))
      .map(line => {
        const [key, ...valueParts] = line.split('=')
        const value = valueParts.join('=')
        return { key, value: value || '' }
      })

    let envDoc = `# Environment Variables\n\n`
    envDoc += `> Auto-generated on ${new Date().toISOString()}\n\n`
    envDoc += `This document contains all environment variables used by the application.\n\n`

    envDoc += `## Required Variables\n\n`

    const categories = {
      'Supabase': variables.filter(v => v.key.includes('SUPABASE') || v.key.includes('NEXT_PUBLIC_SUPABASE')),
      'AI Services': variables.filter(v => v.key.includes('OPENROUTER') || v.key.includes('OPENAI')),
      'Database': variables.filter(v => v.key.includes('DATABASE')),
      'Optional': variables.filter(v => !v.key.includes('SUPABASE') && !v.key.includes('OPENROUTER') && !v.key.includes('OPENAI') && !v.key.includes('DATABASE'))
    }

    for (const [category, vars] of Object.entries(categories)) {
      if (vars.length > 0) {
        envDoc += `### ${category}\n\n`
        for (const variable of vars) {
          envDoc += `- \`${variable.key}\`: ${variable.value || '(no default)'}\n`
        }
        envDoc += '\n'
      }
    }

    await writeFile(join(this.docsDir, 'environment-variables.md'), envDoc)
  }

  private async updateMainReadme(): Promise<void> {
    console.log('📖 Updating main README...')

    const readmePath = join(this.projectRoot, 'README.md')
    let readmeContent = ''

    try {
      readmeContent = await readFile(readmePath, 'utf-8')
    } catch {
      console.warn('⚠️ README.md not found, creating new one...')
    }

    // Check if documentation section exists
    if (readmeContent.includes('## Documentation')) {
      // Update existing documentation section
      const docSection = `## Documentation\n\n- **[API Documentation](docs/api/server-actions.md)** - Server Actions reference\n- **[Component Documentation](docs/components/index.md)** - React components reference\n- **[Database Schema](docs/database/schema.md)** - Database tables and relationships\n- **[Environment Variables](docs/environment-variables.md)** - Configuration options\n- **[Architecture](docs/architecture/system-overview.md)** - System architecture and design\n- **[Developer Guide](docs/developer/development-guide.md)** - Development patterns and best practices\n- **[Testing Guide](docs/testing/comprehensive-testing.md)** - Testing strategies and procedures\n- **[User Guides](docs/user-guides/)** - Feature-specific user documentation`

      const startMarker = '## Documentation'
      const endMarker = '\n## '
      const startIndex = readmeContent.indexOf(startMarker)
      const endIndex = readmeContent.indexOf(endMarker, startIndex)

      if (startIndex !== -1 && endIndex !== -1) {
        readmeContent = readmeContent.substring(0, startIndex) + docSection + readmeContent.substring(endIndex)
      }
    } else {
      // Add documentation section
      readmeContent += `\n## Documentation\n\n`
      readmeContent += `- **[API Documentation](docs/api/server-actions.md)** - Server Actions reference\n`
      readmeContent += `- **[Component Documentation](docs/components/index.md)** - React components reference\n`
      readmeContent += `- **[Database Schema](docs/database/schema.md)** - Database tables and relationships\n`
      readmeContent += `- **[Environment Variables](docs/environment-variables.md)** - Configuration options\n`
      readmeContent += `- **[Architecture](docs/architecture/system-overview.md)** - System architecture and design\n`
      readmeContent += `- **[Developer Guide](docs/developer/development-guide.md)** - Development patterns and best practices\n`
      readmeContent += `- **[Testing Guide](docs/testing/comprehensive-testing.md)** - Testing strategies and procedures\n`
      readmeContent += `- **[User Guides](docs/user-guides/)** - Feature-specific user documentation\n`
    }

    await writeFile(readmePath, readmeContent)
  }

  private async validateDocumentation(): Promise<void> {
    console.log('✅ Validating generated documentation...')

    const docFiles = [
      'api/server-actions.md',
      'components/index.md',
      'database/schema.md',
      'environment-variables.md'
    ]

    for (const file of docFiles) {
      const filePath = join(this.docsDir, file)
      try {
        const content = await readFile(filePath, 'utf-8')
        if (content.length === 0) {
          throw new Error(`Documentation file ${file} is empty`)
        }
        console.log(`✓ ${file} - ${content.length} characters`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Validation failed for ${file}: ${errorMessage}`)
      }
    }
  }

  private async findServerActions(dir: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          files.push(...await this.findServerActions(fullPath))
        } else if (entry.name.endsWith('.ts')) {
          const content = await readFile(fullPath, 'utf-8')
          if (content.includes("'use server'")) {
            files.push(fullPath)
          }
        }
      }
    } catch {
      // Directory doesn't exist or is not accessible
    }

    return files
  }

  private async findComponents(dir: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          files.push(...await this.findComponents(fullPath))
        } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
          files.push(fullPath)
        }
      }
    } catch {
      // Directory doesn't exist or is not accessible
    }

    return files
  }

  private async generateServerActionDoc(filePath: string): Promise<string> {
    const content = await readFile(filePath, 'utf-8')
    const fileName = basename(filePath, '.ts')

    let doc = `### ${fileName}\n\n`
    doc += `**Location**: \`src/actions/${filePath.replace(this.projectRoot + '/src/actions/', '')}\`\n\n`

    // Extract function exports
    const functionRegex = /export async function (\w+)\([^)]*\): Promise<(\w+)>/g
    const functions = []
    let match

    while ((match = functionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        returnType: match[2]
      })
    }

    if (functions.length === 0) {
      doc += `No exported functions found.\n\n`
      return doc
    }

    for (const func of functions) {
      doc += `#### ${func.name}\n\n`
      doc += `**Returns**: Promise<${func.returnType}>\n\n`

      // Extract function body to understand parameters
      const funcRegex = new RegExp(`export async function ${func.name}\\(([^)]*)\\)`)
      const funcMatch = content.match(funcRegex)

      if (funcMatch) {
        const params = funcMatch[1]
        doc += `**Parameters**: ${params || 'none'}\n\n`
      }

      doc += `**Usage Example**:\n\`\`\`typescript\n`
      doc += `const result = await ${func.name}({\n`
      doc += `  // parameters\n`
      doc += `})\n\`\`\`\n\n`
    }

    return doc
  }

  private async generateComponentDoc(filePath: string): Promise<string> {
    const content = await readFile(filePath, 'utf-8')
    const fileName = basename(filePath, '.tsx')

    let doc = `### ${fileName}\n\n`
    doc += `**Location**: \`src/components/${filePath.replace(this.projectRoot + '/src/components/', '')}\`\n\n`

    // Extract component interface
    const interfaceRegex = /interface (\w+Props[^{]*)\{([^}]+)\}/g
    const interfaceMatch = interfaceRegex.exec(content)

    if (interfaceMatch) {
      const props = interfaceMatch[2]
      doc += `**Props**:\n\`\`\`typescript\n${props}\n\`\`\`\n\n`
    }

    doc += `**Usage Example**:\n\`\`\`tsx\n`
    doc += `import { ${fileName} } from '@/components/${filePath.replace(this.projectRoot + '/src/components/', '').replace('.tsx', '')}'\n\n`
    doc += `export function ExampleComponent() {\n`
    doc += `  return <${fileName} />\n`
    doc += `}\n\`\`\`\n\n`

    return doc
  }

  private async generateTableDoc(table: { name: string; actualName: string; definition: string }): Promise<string> {
    let doc = `### ${table.name}\n\n`
    doc += `**Table Name**: \`${table.actualName}\`\n\n`

    // Extract columns from definition
    const columnRegex = /(\w+)\s*\([^)]+\)/g
    const columns = []
    let match

    while ((match = columnRegex.exec(table.definition)) !== null) {
      columns.push(match[1])
    }

    if (columns.length > 0) {
      doc += `**Columns**:\n`
      for (const column of columns) {
        doc += `- \`${column}\`\n`
      }
      doc += '\n'
    }

    doc += `**Definition**:\n\`\`\`typescript\n`
    doc += `export const ${table.name} = pgTable('${table.actualName}', {\n`
    doc += `${table.definition}\n`
    doc += `})\n\`\`\`\n\n`

    return doc
  }
}

// Run the generator
if (require.main === module) {
  const generator = new DocumentationGenerator()
  generator.generateAllDocumentation().catch(console.error)
}

export { DocumentationGenerator }