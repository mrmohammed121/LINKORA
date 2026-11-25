import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  answerWebsiteQuestion,
  LINKORA_WEBSITE_REFERENCES,
} from '../lib/websiteKnowledge.js';

const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Please enter a question for the LINKORA Guide')
    .max(500, 'Question must be 500 characters or fewer'),
  currentPath: z.string().trim().max(200).optional(),
});

export async function assistantRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/assistant/references', async (_request, reply) => {
    return reply.send({
      references: LINKORA_WEBSITE_REFERENCES.map((ref) => ({
        id: ref.id,
        title: ref.title,
        route: ref.route,
        routeLabel: ref.routeLabel,
        category: ref.category,
        summary: ref.summary,
      })),
    });
  });

  app.post('/api/assistant/chat', async (request, reply) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid assistant query',
      });
    }

    const result = answerWebsiteQuestion(parsed.data.message, parsed.data.currentPath);
    return reply.send(result);
  });
}
