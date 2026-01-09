'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronLeft, ChevronRight, User, Briefcase, Star, Settings, CheckCircle } from 'lucide-react'

interface QuestionnaireStepperProps {
  questions: Array<{
    id: string
    question_category: string
    question_text: string
    is_required: string
    metadata: {
      type: string
      options?: string[]
      placeholder?: string
      maxLength?: number
    }
  }>
  responses: Record<string, any>
  skippedQuestions: Record<string, string>
  onResponseChange: (questionId: string, value: any) => void
  onSkip: (questionId: string, reason?: string) => void
  onComplete: () => void
  onBack: () => void
  isSubmitting?: boolean
}

const categoryIcons = {
  personal: User,
  career: Briefcase,
  experience: Star,
  formatting: Settings,
}

const categoryOrder = ['personal', 'career', 'experience', 'formatting']

export function QuestionnaireStepper({
  questions,
  responses,
  skippedQuestions,
  onResponseChange,
  onSkip,
  onComplete,
  onBack,
  isSubmitting = false,
}: QuestionnaireStepperProps) {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [showValidationErrors, setShowValidationErrors] = useState(false)

  // Group questions by category
  const questionsByCategory = categoryOrder.reduce((acc, category) => {
    acc[category] = questions.filter(q => q.question_category === category)
    return acc
  }, {} as Record<string, typeof questions>)

  const currentCategory = categoryOrder[currentCategoryIndex]
  const currentQuestions = questionsByCategory[currentCategory] || []
  const totalCategories = categoryOrder.filter(cat => questionsByCategory[cat].length > 0).length
  const answeredCategories = categoryOrder.filter(cat => {
    const categoryQuestions = questionsByCategory[cat] || []
    const hasRequiredAnswers = categoryQuestions
      .filter(q => q.is_required === 'true')
      .every(q => responses[q.id] !== undefined && responses[q.id] !== '')

    return categoryQuestions.length === 0 || hasRequiredAnswers
  }).length

  const progressPercentage = (answeredCategories / totalCategories) * 100

  const validateCurrentCategory = () => {
    const requiredQuestions = currentQuestions.filter(q => q.is_required === 'true')
    const missingAnswers = requiredQuestions.filter(q =>
      responses[q.id] === undefined || responses[q.id] === '',
    )

    if (missingAnswers.length > 0) {
      setShowValidationErrors(true)
      return false
    }

    setShowValidationErrors(false)
    return true
  }

  const handleNext = () => {
    if (!validateCurrentCategory()) {
      return
    }

    if (currentCategoryIndex < totalCategories - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1)
      setShowValidationErrors(false)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1)
      setShowValidationErrors(false)
    } else {
      onBack()
    }
  }

  const canProceed = () => {
    const requiredQuestions = currentQuestions.filter(q => q.is_required === 'true')
    return requiredQuestions.every(q =>
      responses[q.id] !== undefined && responses[q.id] !== '',
    )
  }

  const Icon = categoryIcons[currentCategory as keyof typeof categoryIcons] || User

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon className="h-5 w-5" />
              Information Collection
            </CardTitle>
            <Badge variant="secondary">
              {answeredCategories}/{totalCategories} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>

          {/* Category Navigation */}
          <div className="flex flex-wrap gap-2">
            {categoryOrder.map((category, index) => {
              const categoryQuestions = questionsByCategory[category] || []
              if (categoryQuestions.length === 0) return null

              const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons]
              const isCompleted = index < currentCategoryIndex
              const isCurrent = category === currentCategory
              const hasAnsweredRequired = categoryQuestions
                .filter(q => q.is_required === 'true')
                .every(q => responses[q.id] !== undefined && responses[q.id] !== '')

              return (
                <Button
                  key={category}
                  variant={isCurrent ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    if (index <= currentCategoryIndex || hasAnsweredRequired) {
                      setCurrentCategoryIndex(index)
                      setShowValidationErrors(false)
                    }
                  }}
                  disabled={index > currentCategoryIndex && !hasAnsweredRequired}
                >
                  <CategoryIcon className="h-4 w-4" />
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  {isCompleted && <CheckCircle className="h-3 w-3 text-green-600" />}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {showValidationErrors && (
        <Alert variant="destructive">
          <AlertDescription>
            Please answer all required questions before proceeding.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Category Questions */}
      {currentQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <h2 className="text-xl font-semibold capitalize">
              {currentCategory} Information
            </h2>
            <Badge variant="outline">
              {currentQuestions.length} question{currentQuestions.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {currentQuestions.map((question) => (
            <div key={question.id}>
              {/* Question card will be rendered here */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {question.question_text}
                  {question.is_required === 'true' && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>

                {/* This would be replaced with the actual QuestionCard component */}
                <div className="p-3 border rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Question: {question.question_text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Type: {question.metadata.type}
                    {question.metadata.options && (
                      <> | Options: {question.metadata.options.join(', ')}</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isSubmitting}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentCategoryIndex === 0 ? 'Back to Approvals' : 'Previous'}
        </Button>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Step {currentCategoryIndex + 1} of {totalCategories}
          </span>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
          >
            {isSubmitting ? (
              'Processing...'
            ) : currentCategoryIndex === totalCategories - 1 ? (
              'Complete'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
