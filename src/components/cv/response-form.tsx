"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SkipForward, User, Briefcase, Star, Settings, Info } from "lucide-react"

interface ResponseFormProps {
  question: {
    id: string
    question_category?: string
    category?: string  // For QuestionTemplate structure
    question_text?: string
    text?: string       // For QuestionTemplate structure
    is_required?: string
    required?: boolean  // For QuestionTemplate structure
    metadata?: {
      type: string
      options?: string[]
      placeholder?: string
      maxLength?: number
    }
    // Direct properties from QuestionTemplate
    type?: string
    options?: string[]
    placeholder?: string
    maxLength?: number
  }
  value: string | string[] | boolean | null
  onChange: (value: string | string[] | boolean | null) => void
  onSkip: (reason?: string) => void
  isSkipped: boolean
  skipReason?: string
  showValidationErrors?: boolean
}

const categoryIcons = {
  personal: User,
  career: Briefcase,
  experience: Star,
  formatting: Settings,
}

const categoryColors = {
  personal: "bg-blue-50 border-blue-200 text-blue-800",
  career: "bg-green-50 border-green-200 text-green-800",
  experience: "bg-purple-50 border-purple-200 text-purple-800",
  formatting: "bg-orange-50 border-orange-200 text-orange-800",
}

export function ResponseForm({
  question,
  value,
  onChange,
  onSkip,
  isSkipped,
  skipReason,
  showValidationErrors = false
}: ResponseFormProps) {
  const [showSkipDialog, setShowSkipDialog] = useState(false)
  const [tempSkipReason, setTempSkipReason] = useState("")

  // Handle both database structure and QuestionTemplate structure
  const category = question.question_category || question.category || 'personal'
  const questionText = question.question_text || question.text || ''
  const isRequired = question.is_required === 'true' || question.required === true

  // Extract type, options, placeholder, maxLength from either metadata or direct properties
  const type = question.metadata?.type || question.type || 'text'
  const options = question.metadata?.options || question.options || []
  const placeholder = question.metadata?.placeholder || question.placeholder || ''
  const maxLength = question.metadata?.maxLength || question.maxLength

  const Icon = categoryIcons[category as keyof typeof categoryIcons] || User
  const categoryColor = categoryColors[category as keyof typeof categoryColors]

  const hasValue = value !== undefined && value !== '' && value !== null
  const showError = showValidationErrors && isRequired && !hasValue && !isSkipped

  const renderInput = () => {
    if (isSkipped) {
      return (
        <Alert>
          <SkipForward className="h-4 w-4" />
          <AlertDescription>
            This question was skipped. {skipReason && `Reason: ${skipReason}`}
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => {
                onChange('')
                onSkip()
              }}
            >
              Answer instead
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    switch (type) {
      case 'text':
        return (
          <Input
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Enter your answer"}
            maxLength={maxLength}
            className={showError ? "border-red-500" : ""}
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Enter your answer"}
            maxLength={maxLength}
            rows={4}
            className={showError ? "border-red-500" : ""}
          />
        )

      case 'select':
        return (
          <Select value={String(value || '')} onValueChange={onChange}>
            <SelectTrigger className={showError ? "border-red-500" : ""}>
              <SelectValue placeholder={placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className={`space-y-2 ${showError ? "border border-red-500 rounded-md p-2" : ""}`}>
            {options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selectedValues, option])
                    } else {
                      onChange(selectedValues.filter((v: string) => v !== option))
                    }
                  }}
                />
                <label
                  htmlFor={`${question.id}-${option}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        )

      case 'yesno':
        const booleanValue = Boolean(value)
        return (
          <div className="flex space-x-4">
            <Button
              type="button"
              variant={booleanValue ? "default" : "outline"}
              onClick={() => onChange(true)}
              className={showError && !booleanValue ? "border-red-500" : ""}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={!booleanValue && value !== null ? "default" : "outline"}
              onClick={() => onChange(false)}
              className={showError && booleanValue ? "border-red-500" : ""}
            >
              No
            </Button>
          </div>
        )

      default:
        return (
          <Input
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Enter your answer"}
            className={showError ? "border-red-500" : ""}
          />
        )
    }
  }

  const handleSkip = () => {
    if (isRequired) {
      return // Cannot skip required questions
    }

    if (showSkipDialog) {
      onSkip(tempSkipReason)
      setShowSkipDialog(false)
      setTempSkipReason("")
    } else {
      setShowSkipDialog(true)
    }
  }

  return (
    <Card className={`transition-all duration-200 ${isSkipped ? 'opacity-60' : ''} ${showError ? 'border-red-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${categoryColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{questionText}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {category}
                </Badge>
                {isRequired && (
                  <Badge variant="destructive" className="text-xs">
                    Required
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showError && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              This question is required and must be answered.
            </AlertDescription>
          </Alert>
        )}

        {renderInput()}

        {showSkipDialog && !isRequired && (
          <div className="space-y-2 p-3 border rounded-md bg-muted">
            <p className="text-sm font-medium">Reason for skipping (optional):</p>
            <Input
              placeholder="e.g., Not applicable, Don't have this experience"
              value={tempSkipReason}
              onChange={(e) => setTempSkipReason(e.target.value)}
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSkip}>
                Skip
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowSkipDialog(false)
                  setTempSkipReason("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showSkipDialog && !isRequired && !isSkipped && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            <SkipForward className="h-4 w-4 mr-1" />
            Skip this question
          </Button>
        )}

        {maxLength && !isSkipped && (
          <div className="text-xs text-muted-foreground text-right">
            {typeof value === 'string' ? value.length : typeof value === 'object' && Array.isArray(value) ? value.length : 0} / {maxLength} characters
          </div>
        )}

        {type === 'textarea' && !isSkipped && (
          <div className="text-xs text-muted-foreground">
            <p>Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Be specific and provide concrete examples</li>
              <li>Use action verbs to describe your experience</li>
              <li>Focus on achievements and results</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}