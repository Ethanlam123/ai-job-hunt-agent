/**
 * TaskService
 *
 * Manages background task tracking and status updates
 * Used for long-running operations like CV analysis, cover letter generation, etc.
 */

import { db } from '@/lib/db'
import { tasks, type Task, type NewTask } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export type TaskStatus = 'processing' | 'completed' | 'failed'
export type TaskType = 'cv_analysis' | 'cover_letter' | 'interview_generation' | 'skill_gap_analysis'

export interface TaskResult {
  id: string
  status: TaskStatus
  result?: any
  errorMessage?: string
  metadata?: any
  createdAt: Date
  completedAt?: Date | null
}

export class TaskService {
  /**
   * Create a new task
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param taskType - Type of task
   * @param metadata - Additional task metadata
   * @returns Created task ID
   */
  async createTask(
    userId: string,
    sessionId: string,
    taskType: TaskType,
    metadata?: any
  ): Promise<string> {

    const newTask: NewTask = {
      userId,
      sessionId,
      taskType,
      status: 'processing',
      metadata,
      createdAt: new Date(),
    }

    const result = await db.insert(tasks).values(newTask).returning()

    return result[0].id
  }

  /**
   * Get task by ID
   * @param taskId - Task ID
   * @param userId - Optional user ID for authorization check
   * @returns Task or null if not found
   */
  async getTask(taskId: string, userId?: string): Promise<TaskResult | null> {

    const conditions = userId ? and(eq(tasks.id, taskId), eq(tasks.userId, userId)) : eq(tasks.id, taskId)

    const result = await db.select().from(tasks).where(conditions).limit(1)

    if (!result || result.length === 0) {
      return null
    }

    const task = result[0]

    return {
      id: task.id,
      status: task.status as TaskStatus,
      result: task.result,
      errorMessage: task.errorMessage || undefined,
      metadata: task.metadata,
      createdAt: task.createdAt || new Date(),
      completedAt: task.completedAt,
    }
  }

  /**
   * Update task status
   * @param taskId - Task ID
   * @param status - New status
   * @param result - Optional result data (for completed tasks)
   * @param errorMessage - Optional error message (for failed tasks)
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    result?: any,
    errorMessage?: string
  ): Promise<void> {

    const updateData: Partial<Task> = {
      status,
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date()
    }

    if (result !== undefined) {
      updateData.result = result
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage
    }

    await db.update(tasks).set(updateData).where(eq(tasks.id, taskId))
  }

  /**
   * Mark task as completed with result
   * @param taskId - Task ID
   * @param result - Task result data
   */
  async completeTask(taskId: string, result: any): Promise<void> {
    await this.updateTaskStatus(taskId, 'completed', result)
  }

  /**
   * Mark task as failed with error message
   * @param taskId - Task ID
   * @param errorMessage - Error message
   */
  async failTask(taskId: string, errorMessage: string): Promise<void> {
    await this.updateTaskStatus(taskId, 'failed', undefined, errorMessage)
  }

  /**
   * Get all tasks for a session
   * @param sessionId - Session ID
   * @param userId - User ID for authorization
   * @returns Array of tasks
   */
  async getSessionTasks(sessionId: string, userId: string): Promise<TaskResult[]> {

    const result = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.sessionId, sessionId), eq(tasks.userId, userId)))
      .orderBy(tasks.createdAt)

    return result.map((task) => ({
      id: task.id,
      status: task.status as TaskStatus,
      result: task.result,
      errorMessage: task.errorMessage || undefined,
      metadata: task.metadata,
      createdAt: task.createdAt || new Date(),
      completedAt: task.completedAt,
    }))
  }

  /**
   * Get all tasks for a user
   * @param userId - User ID
   * @param limit - Maximum number of tasks to return
   * @returns Array of tasks
   */
  async getUserTasks(userId: string, limit: number = 50): Promise<TaskResult[]> {

    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.createdAt)
      .limit(limit)

    return result.map((task) => ({
      id: task.id,
      status: task.status as TaskStatus,
      result: task.result,
      errorMessage: task.errorMessage || undefined,
      metadata: task.metadata,
      createdAt: task.createdAt || new Date(),
      completedAt: task.completedAt,
    }))
  }

  /**
   * Delete old completed tasks (cleanup)
   * @param olderThanDays - Delete tasks older than this many days
   * @returns Number of deleted tasks
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await db
      .delete(tasks)
      .where(
        and(
          eq(tasks.status, 'completed'),
          eq(tasks.createdAt, cutoffDate)
        )
      )

    return result.rowCount || 0
  }

  /**
   * Poll task status until completion or failure
   * @param taskId - Task ID
   * @param userId - User ID for authorization
   * @param maxAttempts - Maximum polling attempts (default: 60)
   * @param intervalMs - Polling interval in milliseconds (default: 1000)
   * @returns Final task result
   */
  async pollTask(
    taskId: string,
    userId: string,
    maxAttempts: number = 60,
    intervalMs: number = 1000
  ): Promise<TaskResult | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const task = await this.getTask(taskId, userId)

      if (!task) {
        return null
      }

      if (task.status === 'completed' || task.status === 'failed') {
        return task
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    // Timeout reached
    return await this.getTask(taskId, userId)
  }
}

/**
 * Create a task service instance
 */
export function createTaskService(): TaskService {
  return new TaskService()
}
