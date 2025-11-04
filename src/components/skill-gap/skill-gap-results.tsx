"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart3, CheckCircle2, AlertTriangle, TrendingUp,
  Clock, Target, BookOpen, ThumbsUp, XCircle, Info,
  Award, Zap, Calendar, Lightbulb
} from "lucide-react";

interface SkillGap {
  id: string;
  skillName: string;
  category: 'technical' | 'soft' | 'domain';
  importance: 'critical' | 'important' | 'nice-to-have';
  currentLevel: 'none' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  requiredLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  timeline: 'short' | 'medium' | 'long';
  learningAdvice: string;
  gapDescription: string;
  reasoning: string;
  status: 'pending' | 'in_progress' | 'completed' | 'not_interested';
  learningResources: any[];
}

interface SkillGapAnalysis {
  overallMatch: {
    score: number;
    summary: string;
    strengths: string[];
    criticalGaps: string[];
  };
  skillGaps: SkillGap[];
  strengthsToHighlight: any[];
  generalAdvice: {
    overallStrategy: string;
    quickWins: string[];
    longTermGoals: string[];
    nextSteps: string[];
  };
  jobDescriptionQuality?: any;
}

interface SkillGapResultsProps {
  analysis: SkillGapAnalysis;
  organizedGaps?: {
    short: SkillGap[];
    medium: SkillGap[];
    long: SkillGap[];
  };
  onStatusUpdate: (skillGapId: string, status: 'pending' | 'in_progress' | 'completed' | 'not_interested', notes?: string) => void;
  isTemporaryId?: (skillGapId: string) => boolean;
}

export function SkillGapResults({ analysis, organizedGaps, onStatusUpdate, isTemporaryId }: SkillGapResultsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get color for match score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get color for importance badge
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return 'destructive';
      case 'important': return 'default';
      case 'nice-to-have': return 'secondary';
      default: return 'outline';
    }
  };

  // Get timeline icon
  const getTimelineIcon = (timeline: string) => {
    switch (timeline) {
      case 'short': return <Zap className="h-4 w-4 text-green-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'long': return <Calendar className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Get level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'bg-purple-500/20 text-purple-300 dark:bg-purple-500/30 dark:text-purple-200 border border-purple-500/30';
      case 'advanced': return 'bg-blue-500/20 text-blue-300 dark:bg-blue-500/30 dark:text-blue-200 border border-blue-500/30';
      case 'intermediate': return 'bg-green-500/20 text-green-300 dark:bg-green-500/30 dark:text-green-200 border border-green-500/30';
      case 'beginner': return 'bg-yellow-500/20 text-yellow-300 dark:bg-yellow-500/30 dark:text-yellow-200 border border-yellow-500/30';
      case 'none': return 'bg-red-500/20 text-red-300 dark:bg-red-500/30 dark:text-red-200 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 dark:bg-gray-500/30 dark:text-gray-200 border border-gray-500/30';
    }
  };

  // Filter skill gaps by category
  const filteredGaps = selectedCategory === 'all'
    ? analysis.skillGaps
    : analysis.skillGaps.filter(gap => gap.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Overall Match Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Match Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${getScoreColor(analysis.overallMatch.score)}`}>
                {analysis.overallMatch.score}%
              </div>
              <div>
                <p className="text-sm text-gray-600">Match Score</p>
                <p className="text-xs text-gray-500">Based on skills and experience</p>
              </div>
            </div>
            <Progress value={analysis.overallMatch.score} className="w-32" />
          </div>
          <p className="text-gray-700">{analysis.overallMatch.summary}</p>
        </CardContent>
      </Card>

      {/* Job Description Quality Warning */}
      {analysis.jobDescriptionQuality && !analysis.jobDescriptionQuality.isSufficient && (
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                Job description quality was limited ({analysis.jobDescriptionQuality.qualityScore}/100)
              </p>
              <p className="text-sm">
                The analysis provides general guidance. For more accurate results, ask for a more detailed job description with specific skills and requirements.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Strengths and Critical Gaps */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.overallMatch.strengths.map((strength, index) => (
                <div key={index} className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{strength}</span>
                </div>
              ))}
              {analysis.strengthsToHighlight.map((strength, index) => (
                <div key={`highlight-${index}`} className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">{strength.skillName}</p>
                    <p className="text-xs text-gray-500">{strength.howToHighlight}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Critical Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.overallMatch.criticalGaps.map((gap, index) => (
                <div key={index} className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">{gap}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill Gaps by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Skill Gaps Analysis
          </CardTitle>
          <CardDescription>
            Detailed breakdown of skills you need to develop for this role
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Category Filter */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All ({analysis.skillGaps.length})
            </Button>
            <Button
              variant={selectedCategory === 'technical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('technical')}
            >
              Technical ({analysis.skillGaps.filter(g => g.category === 'technical').length})
            </Button>
            <Button
              variant={selectedCategory === 'soft' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('soft')}
            >
              Soft Skills ({analysis.skillGaps.filter(g => g.category === 'soft').length})
            </Button>
            <Button
              variant={selectedCategory === 'domain' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('domain')}
            >
              Domain ({analysis.skillGaps.filter(g => g.category === 'domain').length})
            </Button>
          </div>

          {/* Skill Gaps List */}
          <div className="space-y-4">
            {filteredGaps.map((gap) => (
              <Card key={gap.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{gap.skillName}</h4>
                    <Badge variant={getImportanceColor(gap.importance)}>
                      {gap.importance}
                    </Badge>
                    <Badge variant="outline">{gap.category}</Badge>
                    {getTimelineIcon(gap.timeline)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Status:</span>
                    <Badge
                      variant={
                        gap.status === 'completed' ? 'default' :
                        gap.status === 'in_progress' ? 'secondary' :
                        gap.status === 'not_interested' ? 'outline' : 'outline'
                      }
                    >
                      {gap.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Current vs Required Level */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Current:</span>
                    <Badge className={getLevelColor(gap.currentLevel)}>
                      {gap.currentLevel}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Required:</span>
                    <Badge className={getLevelColor(gap.requiredLevel)}>
                      {gap.requiredLevel}
                    </Badge>
                  </div>
                </div>

                {/* Gap Description */}
                <p className="text-sm text-gray-700 mb-3">{gap.gapDescription}</p>

                {/* Learning Advice */}
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Learning Advice</span>
                  </div>
                  <p className="text-sm text-blue-700">{gap.learningAdvice}</p>
                </div>

                {/* Reasoning */}
                <p className="text-xs text-gray-500 mb-4">{gap.reasoning}</p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isTemporaryId?.(gap.id) ? (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        This analysis uses temporary IDs. Run a new analysis to enable status tracking.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {gap.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => onStatusUpdate(gap.id, 'in_progress')}
                          >
                            <BookOpen className="h-4 w-4 mr-1" />
                            Start Learning
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusUpdate(gap.id, 'not_interested')}
                          >
                            Not Interested
                          </Button>
                        </>
                      )}
                      {gap.status === 'in_progress' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => onStatusUpdate(gap.id, 'completed')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusUpdate(gap.id, 'pending')}
                          >
                            Pause
                          </Button>
                        </>
                      )}
                      {gap.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStatusUpdate(gap.id, 'in_progress')}
                        >
                          <Target className="h-4 w-4 mr-1" />
                          Continue Learning
                        </Button>
                      )}
                      {gap.status === 'not_interested' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStatusUpdate(gap.id, 'pending')}
                        >
                          Reconsider
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* General Advice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your Learning Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Quick Wins
              </h4>
              <ul className="space-y-2">
                {analysis.generalAdvice.quickWins.map((win, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {win}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Long-term Goals
              </h4>
              <ul className="space-y-2">
                {analysis.generalAdvice.longTermGoals.map((goal, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-blue-500" />
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold mb-3">Overall Strategy</h4>
            <p className="text-gray-700 mb-4">{analysis.generalAdvice.overallStrategy}</p>

            <h4 className="font-semibold mb-3">Next Steps</h4>
            <ol className="space-y-2">
              {analysis.generalAdvice.nextSteps.map((step, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-blue-600">{index + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}