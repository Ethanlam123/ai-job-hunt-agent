#!/usr/bin/env npx tsx

/**
 * Documentation Generator
 *
 * Auto-generates API, component, and database documentation.
 */

import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises'
import { join, basename } from 'path'

class DocumentationGenerator {
  private readonly projectRoot: string
  private readonly docsDir: string

  constructor() {
    this.projectRoot = process.cwd()
    this.docsDir = join(this.projectRoot, 'docs')
  }

  async generateAll(): Promise<void> {
    console.log('Generating documentation...')

    await this.ensureDocsDirectory()
    await this.generateAPIDocumentation()
    await this.generateComponentDocumentation()
    await this.generateDatabaseDocs()
    await this.generateEnvDocs()
    await this.validateDocs()

    console.log('Documentation generated!')
  }

  private async ensureDocsDirectory(): Promise<void> {
    try {
      await stat(this.docsDir)
    } catch {
      await mkdir(join(this.docsDir, 'api'), { recursive: true })
      await mkdir(join(this.docsDir, 'components'), { recursive: true })
      await mkdir(join(this.docsDir, 'database'), { recursive: true })
    }
  }

  private async generateAPIDocumentation(): Promise<void> {
    const actionsDir = join(this.projectRoot, 'src/actions')
    const serverActions = await this.findServerActions(actionsDir)

    let doc = `# Server Actions API\n\n> Generated: ${new Date().toISOString()}\n\n`

    for (const action of serverActions) {
      doc += await this.generateServerActionDoc(action)
    }

    await writeFile(join(this.docsDir, 'api', 'server-actions.md'), doc)
  }

  private async generateComponentDocumentation(): Promise<void> {
    const componentsDir = join(this.projectRoot, 'src/components')
    const components = await this.findComponents(componentsDir)

    let doc = `# Component Reference\n\n> Generated: ${new Date().toISOString()}\n\n`

    for (const component of components) {
      doc += await this.generateComponentDoc(component)
    }

    await writeFile(join(this.docsDir, 'components', 'index.md'), doc)
  }

  private async generateDatabaseDocs(): Promise<void> {
    const schemaPath = join(this.projectRoot, 'src/lib/db/schema.ts')

    try {
      const schemaContent = await readFile(schemaPath, 'utf-8')
      const tableRegex = /export const (\w+) = pgTable\('(\w+)'[^{]*\{([\s\S]*?)\}\)/g
      const tables: Array<{ name: string; actualName: string; definition: string }> = []
      let match: RegExpExecArray | null

      while ((match = tableRegex.exec(schemaContent)) !== null) {
        tables.push({
          name: match[1],
          actualName: match[2],
          definition: match[3].trim()
        })
      }

      let doc = `# Database Schema\n\n> Generated: ${new Date().toISOString()}\n\n`

      for (const table of tables) {
        doc += `## ${table.name}\n\n`
        doc += `**Table**: \`${table.actualName}\`\n\n`
        doc += `**Columns**:\n\`\`\`typescript\n${table.definition}\n\`\`\`\n\n`
      }

      await writeFile(join(this.docsDir, 'database', 'schema.md'), doc)
    } catch {
      console.warn('Could not generate database docs')
    }
  }

  private async generateEnvDocs(): Promise<void> {
    const envExamplePath = join(this.projectRoot, '.env.example')

    try {
      const envContent = await readFile(envExamplePath, 'utf-8')
      const variables = envContent
        .split('\n')
        .filter(line => !line.startsWith('#') && line.includes('='))
        .map(line => {
          const [key, ...valueParts] = line.split('=')
          return { key, value: valueParts.join('=') || '' }
        })

      let doc = `# Environment Variables\n\n> Generated: ${new Date().toISOString()}\n\n`

      const categories = {
        'Supabase': variables.filter(v => v.key.includes('SUPABASE')),
        'AI Services': variables.filter(v => v.key.includes('OPENROUTER') || v.key.includes('OPENAI')),
        'Database': variables.filter(v => v.key.includes('DATABASE')),
        'Optional': variables.filter(v => !v.key.includes('SUPABASE') && !v.key.includes('OPENROUTER') && !v.key.includes('OPENAI') && !v.key.includes('DATABASE'))
      }

      for (const [category, vars] of Object.entries(categories)) {
        if (vars.length > 0) {
          doc += `### ${category}\n\n`
          for (const v of vars) {
            doc += `- \`${v.key}\`: ${v.value || '(no default)'}\n`
          }
          doc += '\n'
        }
      }

      await writeFile(join(this.docsDir, 'environment-variables.md'), doc)
    } catch {
      console.warn('Could not generate env docs')
    }
  }

  private async validateDocs(): Promise<void> {
    const docFiles = [
      'api/server-actions.md',
      'components/index.md',
      'database/schema.md'
    ]

    for (const file of docFiles) {
      const content = await readFile(join(this.docsDir, file), 'utf-8')
      if (content.length === 0) {
        throw new Error(`Documentation file ${file} is empty`)
      }
      console.log(`Validated: ${file}`)
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
      // Directory doesn't exist
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
      // Directory doesn't exist
    }

    return files
  }

  private async generateServerActionDoc(filePath: string): Promise<string> {
    const content = await readFile(filePath, 'utf-8')
    const fileName = basename(filePath, '.ts')

    let doc = `### ${fileName}\n\n`
    doc += `**Location**: \`src/actions/${filePath.replace(this.projectRoot + '/src/actions/', '')}\`\n\n`

    const functionRegex = /export async function (\w+)\([^)]*\)/g
    const functions: Array<{ name: string }> = []
    let match: RegExpExecArray | null

    while ((match = functionRegex.exec(content)) !== null) {
      functions.push({ name: match[1] })
    }

    for (const func of functions) {
      doc += `#### ${func.name}\n\n`
      doc += `**Usage**:\n\`\`\`typescript\n`
      doc += `const result = await ${func.name}(params)\n\`\`\`\n\n`
    }

    return doc
  }

  private async generateComponentDoc(filePath: string): Promise<string> {
    const content = await readFile(filePath, 'utf-8')
    const fileName = basename(filePath, '.tsx')

    let doc = `### ${fileName}\n\n`
    doc += `**Location**: \`src/components/${filePath.replace(this.projectRoot + '/src/components/', '')}\`\n\n`

    const interfaceRegex = /interface (\w+Props[^{]*)\{([^}]+)\}/
    const interfaceMatch = interfaceRegex.exec(content)

    if (interfaceMatch) {
      doc += `**Props**:\n\`\`\`typescript\n${interfaceMatch[2]}\n\`\`\`\n\n`
    }

    return doc
  }
}

if (require.main === module) {
  new DocumentationGenerator().generateAll().catch(console.error)
}

export { DocumentationGenerator }
