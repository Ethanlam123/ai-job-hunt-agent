"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Target,
  Award,
} from "lucide-react"
import {
  generateInterviewQuestions,
  getInterviewQuestions,
  submitAnswer,
  getSessionProgress,
  analyzeInterviewPerformance,
} from "@/actions/interview"

interface Question {
  id: string
  questionType: string
  difficulty: string
  questionText: string
  expectedAnswer: string
  evaluationCriteria: string[]
  orderIndex: number
  userAnswer?: string
  evaluationResult?: any
  answeredAt?: string
  metadata?: any
}

interface Evaluation {
  score: number
  strengths: Array<{ point: string; explanation: string }>
  weaknesses: Array<{ point: string; explanation: string }>
  missingPoints: string[]
  overallFeedback: string
  improvementSuggestions: Array<{
    area: string
    suggestion: string
    example: string
  }>
  followUpQuestions: string[]
}

interface PerformanceAnalysis {
  overallScore: number
  categoryScores: Record<string, number>
  strengthAreas: Array<{ area: string; description: string; examples: string[] }>
  improvementAreas: Array<{
    area: string
    description: string
    priority: string
    actionItems: string[]
  }>
  communicationSkills: {
    score: number
    clarity: string
    structure: string
    conciseness: string
    notes: string[]
  }
  technicalCompetence: {
    score: number
    depth: string
    breadth: string
    notes: string[]
  }
  hiringRecommendation: {
    decision: string
    reasoning: string
    concerns: string[]
    positives: string[]
  }
  preparationTips: Array<{
    topic: string
    recommendation: string
    resources: string[]
  }>
}

type WorkflowStep = 'setup' | 'generating' | 'practice' | 'results'

interface InterviewPracticeClientProps {
  cvDocuments: Array<{ id: string; original_filename: string }>
  jdDocuments: Array<{ id: string; original_filename: string }>
}

export function InterviewPracticeClient({
  cvDocuments,
  jdDocuments,
}: InterviewPracticeClientProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('setup')
  const [cvDocumentId, setCvDocumentId] = useState<string>('')
  const [jdInputMode, setJdInputMode] = useState<'document' | 'text'>('text')
  const [jdDocumentId, setJdDocumentId] = useState<string>('')
  const [jdText, setJdText] = useState<string>('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(null)
  const [showEvaluation, setShowEvaluation] = useState(false)
  const [progress, setProgress] = useState({ totalQuestions: 0, answeredQuestions: 0, percentComplete: 0, averageScore: null as number | null })
  const [performanceAnalysis, setPerformanceAnalysis] = useState<PerformanceAnalysis | null>(null)

  const currentQuestion = questions[currentQuestionIndex]

  const handleGenerateQuestions = async () => {
    if (!cvDocumentId) {
      setError('Please select a CV document')
      return
    }

    if (jdInputMode === 'document' && !jdDocumentId) {
      setError('Please select a Job Description document')
      return
    }

    if (jdInputMode === 'text' && !jdText.trim()) {
      setError('Please enter the Job Description text')
      return
    }

    setIsProcessing(true)
    setError(null)
    setCurrentStep('generating')

    try {
      const result = await generateInterviewQuestions({
        cvDocumentId,
        jdDocumentId: jdInputMode === 'document' ? jdDocumentId : undefined,
        jdText: jdInputMode === 'text' ? jdText : undefined,
        difficulty,
        questionCount,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate questions')
      }

      setSessionId(result.sessionId)

      // Fetch the generated questions
      const questionsResult = await getInterviewQuestions(result.sessionId)
      if (!questionsResult.success || !questionsResult.questions) {
        throw new Error(questionsResult.error || 'Failed to fetch questions')
      }

      setQuestions(questionsResult.questions)
      setCurrentStep('practice')

      // Load progress
      const progressResult = await getSessionProgress(result.sessionId)
      if (progressResult.success && progressResult.progress) {
        setProgress(progressResult.progress)
      }
    } catch (err) {
      console.error('Generate questions error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate questions')
      setCurrentStep('setup')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) {
      setError('Please provide an answer')
      return
    }

    if (!currentQuestion) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const result = await submitAnswer({
        questionId: currentQuestion.id,
        answer: currentAnswer,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit answer')
      }

      setCurrentEvaluation(result.evaluation)
      setShowEvaluation(true)

      // Update the question in local state
      const updatedQuestions = [...questions]
      updatedQuestions[currentQuestionIndex] = {
        ...updatedQuestions[currentQuestionIndex],
        userAnswer: currentAnswer,
        evaluationResult: result.evaluation,
      }
      setQuestions(updatedQuestions)

      // Update progress
      if (sessionId) {
        const progressResult = await getSessionProgress(sessionId)
        if (progressResult.success && progressResult.progress) {
          setProgress(progressResult.progress)
        }
      }
    } catch (err) {
      console.error('Submit answer error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setCurrentAnswer('')
      setCurrentEvaluation(null)
      setShowEvaluation(false)
      setError(null)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      const prevQuestion = questions[currentQuestionIndex - 1]
      setCurrentAnswer(prevQuestion.userAnswer || '')
      setCurrentEvaluation(prevQuestion.evaluationResult || null)
      setShowEvaluation(!!prevQuestion.evaluationResult)
      setError(null)
    }
  }

  const handleViewResults = async () => {
    if (!sessionId) return

    setIsProcessing(true)
    setError(null)

    try {
      const result = await analyzeInterviewPerformance(sessionId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to analyze performance')
      }

      setPerformanceAnalysis(result.performanceAnalysis)
      setCurrentStep('results')
    } catch (err) {
      console.error('Analyze performance error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze performance')
    } finally {
      setIsProcessing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'behavioral':
        return 'bg-blue-500'
      case 'technical':
        return 'bg-purple-500'
      case 'situational':
        return 'bg-green-500'
      case 'competency':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Setup Step
  if (currentStep === 'setup') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Interview Preparation Setup</CardTitle>
            <CardDescription>
              Configure your mock interview session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Your CV</label>
              <Select value={cvDocumentId} onValueChange={setCvDocumentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a CV document" />
                </SelectTrigger>
                <SelectContent>
                  {cvDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.original_filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Job Description</label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={jdInputMode === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setJdInputMode('text')}
                >
                  Paste Text
                </Button>
                <Button
                  type="button"
                  variant={jdInputMode === 'document' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setJdInputMode('document')}
                >
                  Select Document
                </Button>
              </div>

              {jdInputMode === 'text' ? (
                <Textarea
                  placeholder="Paste the job description here..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              ) : (
                <Select value={jdDocumentId} onValueChange={setJdDocumentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a job description" />
                  </SelectTrigger>
                  <SelectContent>
                    {jdDocuments.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.original_filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty Level</label>
              <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Questions</label>
              <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerateQuestions}
              disabled={
                isProcessing ||
                !cvDocumentId ||
                (jdInputMode === 'document' && !jdDocumentId) ||
                (jdInputMode === 'text' && !jdText.trim())
              }
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Generate Interview Questions
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Generating Step
  if (currentStep === 'generating') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h3 className="text-lg font-semibold">Generating Interview Questions</h3>
              <p className="text-sm text-muted-foreground text-center">
                AI is analyzing your CV and job description to create personalized interview questions...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Practice Step
  if (currentStep === 'practice' && currentQuestion) {
    return (
      <div className="space-y-6">
        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">
                  {progress.answeredQuestions} / {progress.totalQuestions} answered
                </span>
              </div>
              <Progress value={progress.percentComplete} className="h-2" />
              {progress.averageScore !== null && (
                <p className="text-sm text-muted-foreground">
                  Average Score: {progress.averageScore.toFixed(1)} / 10
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                <CardDescription>
                  <Badge className={getQuestionTypeColor(currentQuestion.questionType)}>
                    {currentQuestion.questionType}
                  </Badge>
                  <Badge className="ml-2" variant="outline">
                    {currentQuestion.difficulty}
                  </Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-lg">{currentQuestion.questionText}</p>
            </div>

            {!showEvaluation ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Answer</label>
                  <Textarea
                    placeholder="Type your answer here... Use the STAR method (Situation, Task, Action, Result) for behavioral questions."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    rows={8}
                    disabled={isProcessing || !!currentQuestion.userAnswer}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!currentQuestion.userAnswer && (
                  <Button onClick={handleSubmitAnswer} disabled={isProcessing || !currentAnswer.trim()} className="w-full">
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Answer
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              currentEvaluation && (
                <div className="space-y-4">
                  {/* Score */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <span className="font-medium">Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(currentEvaluation.score)}`}>
                      {currentEvaluation.score} / 10
                    </span>
                  </div>

                  {/* Overall Feedback */}
                  <div className="space-y-2">
                    <h4 className="font-semibold">Overall Feedback</h4>
                    <p className="text-sm text-muted-foreground">{currentEvaluation.overallFeedback}</p>
                  </div>

                  {/* Strengths */}
                  {currentEvaluation.strengths.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-600">✓ Strengths</h4>
                      <ul className="space-y-2">
                        {currentEvaluation.strengths.map((strength, idx) => (
                          <li key={idx} className="text-sm">
                            <strong>{strength.point}:</strong> {strength.explanation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {currentEvaluation.weaknesses.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-yellow-600">⚠ Areas for Improvement</h4>
                      <ul className="space-y-2">
                        {currentEvaluation.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="text-sm">
                            <strong>{weakness.point}:</strong> {weakness.explanation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  {currentEvaluation.improvementSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">💡 Suggestions</h4>
                      {currentEvaluation.improvementSuggestions.map((suggestion, idx) => (
                        <Card key={idx}>
                          <CardContent className="pt-4">
                            <p className="text-sm font-medium">{suggestion.area}</p>
                            <p className="text-sm text-muted-foreground mt-1">{suggestion.suggestion}</p>
                            {suggestion.example && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <strong>Example:</strong> {suggestion.example}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Navigation - Only show after answering */}
        {currentQuestion.userAnswer && (
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={handleNextQuestion}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : progress.answeredQuestions === progress.totalQuestions ? (
              <Button
                onClick={handleViewResults}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Performance...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Performance Analysis
                  </>
                )}
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground">
                Complete all questions to view performance analysis ({progress.answeredQuestions}/{progress.totalQuestions} answered)
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Results Step
  if (currentStep === 'results' && performanceAnalysis) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Interview Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Score */}
            <div className="text-center p-6 bg-muted rounded-lg">
              <div className="text-4xl font-bold text-primary mb-2">
                {performanceAnalysis.overallScore}%
              </div>
              <p className="text-muted-foreground">Overall Performance</p>
            </div>

            {/* Category Scores */}
            <div className="space-y-2">
              <h4 className="font-semibold">Category Scores</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(performanceAnalysis.categoryScores).map(([category, score]) => (
                  <div key={category} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm capitalize">{category}</span>
                      <span className={`font-semibold ${getScoreColor(score / 10)}`}>{score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hiring Recommendation */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Hiring Recommendation</h4>
              <Badge className="mb-2">{performanceAnalysis.hiringRecommendation.decision}</Badge>
              <p className="text-sm text-muted-foreground">{performanceAnalysis.hiringRecommendation.reasoning}</p>
            </div>

            {/* Strength Areas */}
            {performanceAnalysis.strengthAreas.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600">✓ Strength Areas</h4>
                {performanceAnalysis.strengthAreas.map((area, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <p className="font-medium">{area.area}</p>
                      <p className="text-sm text-muted-foreground mt-1">{area.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Improvement Areas */}
            {performanceAnalysis.improvementAreas.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-600">⚠ Areas to Improve</h4>
                {performanceAnalysis.improvementAreas.map((area, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">{area.area}</p>
                        <Badge variant={area.priority === 'high' ? 'destructive' : 'secondary'}>
                          {area.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{area.description}</p>
                      <ul className="text-sm space-y-1">
                        {area.actionItems.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button onClick={() => setCurrentStep('setup')} className="w-full">
              Start New Interview Practice
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
