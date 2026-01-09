'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SkipForward, Star, User, Briefcase, Settings, FileText } from 'lucide-react'

interface QuestionCardProps {
  question: {
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
  }
  value: any
  onChange: (value: any) => void
  onSkip: (reason?: string) => void
  isSkipped: boolean
  skipReason?: string
}

const categoryIcons = {
  personal: User,
  career: Briefcase,
  experience: Star,
  formatting: Settings,
}

const categoryColors = {
  personal: 'bg-blue-50 border-blue-200 text-blue-800',
  career: 'bg-green-50 border-green-200 text-green-800',
  experience: 'bg-purple-50 border-purple-200 text-purple-800',
  formatting: 'bg-orange-50 border-orange-200 text-orange-800',
}

export function QuestionCard({
  question,
  value,
  onChange,
  onSkip,
  isSkipped,
  skipReason,
}: QuestionCardProps) {
  const [showSkipReason, setShowSkipReason] = useState(false)
  const [tempSkipReason, setTempSkipReason] = useState('')

  const Icon = categoryIcons[question.question_category as keyof typeof categoryIcons] || FileText
  const categoryColor = categoryColors[question.question_category as keyof typeof categoryColors]
  const isRequired = question.is_required === 'true'
  const { type, options, placeholder, maxLength } = question.metadata

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
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={4}
          />
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder || 'Select an option'} />
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
        return (
          <div className="space-y-2">
            {options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={(value || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = value || []
                    if (checked) {
                      onChange([...currentValues, option])
                    } else {
                      onChange(currentValues.filter((v: string) => v !== option))
                    }
                  }}
                />
                <label
                  htmlFor={`${question.id}-${option}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        )

      case 'yesno':
        return (
          <div className="flex space-x-4">
            <Button
              type="button"
              variant={value === true ? 'default' : 'outline'}
              onClick={() => onChange(true)}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={value === false ? 'default' : 'outline'}
              onClick={() => onChange(false)}
            >
              No
            </Button>
          </div>
        )

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )
    }
  }

  const handleSkip = () => {
    if (isRequired) {
      return // Cannot skip required questions
    }

    if (showSkipReason) {
      onSkip(tempSkipReason)
      setShowSkipReason(false)
      setTempSkipReason('')
    } else {
      setShowSkipReason(true)
    }
  }

  return (
    <Card className={`transition-all duration-200 ${isSkipped ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${categoryColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{question.question_text}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {question.question_category}
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
        {renderInput()}

        {showSkipReason && !isRequired && (
          <div className="space-y-2">
            <Input
              placeholder="Reason for skipping (optional)"
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
                  setShowSkipReason(false)
                  setTempSkipReason('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showSkipReason && !isRequired && !isSkipped && (
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
            {value?.length || 0} / {maxLength} characters
          </div>
        )}
      </CardContent>
    </Card>
  )
}
