/**
 * Test Mocks Setup
 *
 * Centralized mock configurations for tests
 */

export const mockEmbeddingResponse = {
  data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5] }],
}

export const mockOpenAIEmbeddings = {
  create: jest.fn().mockResolvedValue(mockEmbeddingResponse),
}
