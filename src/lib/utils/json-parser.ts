/**
 * Utility functions for parsing LLM responses and handling JSON
 */

export class JSONParser {
  /**
   * Clean and parse JSON from LLM responses
   */
  static cleanAndParseJSON(content: string | any, fallbackValue: any = null): any {
    try {
      // Handle different content types
      const jsonString = typeof content === 'string' ? content : JSON.stringify(content)

      // Remove markdown code blocks
      const cleanedContent = jsonString
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      return JSON.parse(cleanedContent)
    } catch (error) {
      console.warn('Failed to parse JSON:', error)

      // Try additional cleaning if first attempt fails
      if (typeof content === 'string') {
        try {
          const aggressiveClean = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/,\s*}/g, '}') // Remove trailing commas
            .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
            .trim()

          return JSON.parse(aggressiveClean)
        } catch (secondError) {
          console.warn('Aggressive cleaning also failed:', secondError)
        }
      }

      return fallbackValue
    }
  }

  /**
   * Validate JSON structure against expected schema
   */
  static validateStructure(data: any, requiredFields: string[]): boolean {
    if (!data || typeof data !== 'object') {
      return false
    }

    return requiredFields.every(field => {
      const keys = field.split('.')
      let current = data

      for (const key of keys) {
        if (current === null || current === undefined || !current.hasOwnProperty(key)) {
          return false
        }
        current = current[key]
      }

      return true
    })
  }

  /**
   * Extract JSON array from text that might contain other content
   */
  static extractJSONArray(text: string): any[] {
    try {
      // Try to find JSON array in the text
      const arrayMatch = text.match(/\[[\s\S]*?\]/)
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0])
      }
    } catch (error) {
      console.warn('Failed to extract JSON array:', error)
    }

    return []
  }

  /**
   * Sanitize and validate user responses
   */
  static sanitizeResponse(response: any): any {
    if (response === null || response === undefined) {
      return null
    }

    if (typeof response === 'string') {
      // Limit string length to prevent database issues
      return response.length > 10000 ? `${response.substring(0, 10000)  }...` : response
    }

    if (typeof response === 'object' && !Array.isArray(response)) {
      // Recursively sanitize object properties
      const sanitized: any = {}
      for (const [key, value] of Object.entries(response)) {
        sanitized[key] = this.sanitizeResponse(value)
      }
      return sanitized
    }

    if (Array.isArray(response)) {
      // Recursively sanitize array elements
      return response.map(item => this.sanitizeResponse(item))
    }

    // Return numbers, booleans, etc. as-is
    return response
  }

  /**
   * Generate unique question ID
   */
  static generateQuestionId(prefix: string, index: number): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}-${index}-${timestamp}-${random}`
  }

  /**
   * Determine max length based on question category
   */
  static getMaxLengthForCategory(category: string): number {
    const maxLengths: Record<string, number> = {
      achievements: 500,
      experience: 400,
      career: 300,
      personal: 200,
      formatting: 100,
    }

    return maxLengths[category] || 300
  }

  /**
   * Validate question template structure
   */
  static validateQuestionTemplate(question: any): boolean {
    const requiredFields = ['id', 'category', 'question', 'type', 'required']
    return this.validateStructure(question, requiredFields)
  }

  /**
   * Convert LLM question response to QuestionTemplate format
   */
  static convertToQuestionTemplate(llmQuestion: any): any {
    return {
      id: llmQuestion.id || this.generateQuestionId('q', Math.floor(Math.random() * 1000)),
      category: llmQuestion.category || 'general',
      text: llmQuestion.question || llmQuestion.text || 'No question text provided',
      type: llmQuestion.type || 'textarea',
      required: Boolean(llmQuestion.required),
      placeholder: llmQuestion.guidance?.whatToInclude || '',
      maxLength: this.getMaxLengthForCategory(llmQuestion.category || 'general'),
      conditions: {},
      options: (llmQuestion.type === 'select' || llmQuestion.type === 'multiselect') ?
        (llmQuestion.options || []) : undefined,
    }
  }

  /**
   * Batch convert LLM questions to QuestionTemplates
   */
  static batchConvertToQuestionTemplates(questions: any[]): any[] {
    if (!Array.isArray(questions)) {
      return []
    }

    return questions
      .filter(q => this.validateQuestionTemplate(q))
      .map(q => this.convertToQuestionTemplate(q))
  }
}
