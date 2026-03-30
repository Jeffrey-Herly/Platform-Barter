/**
 * Tags API Routes
 * Handles personalized tag management
 */

const { authMiddleware } = require('../middlewares/auth.middleware.js');

module.exports = async function (fastify, opts) {
  // Get user's tags (custom + global)
  fastify.get('/api/tags/user', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const tagsRepository = fastify.diContainer.resolve('tagsRepository');
      const tags = await tagsRepository.getUserTags(request.user.userId);

      return reply.send({
        success: true,
        data: tags,
        total: tags.length
      });
    } catch (error) {
      console.error('[TagsRoute] Error getting user tags:', error);
      return reply.code(500).send({
        error: 'Failed to fetch tags',
        message: error.message
      });
    }
  });

  // Search user's tags
  fastify.get('/api/tags/user/search', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { q } = request.query;
      if (!q || q.trim().length === 0) {
        return reply.send({ success: true, data: [] });
      }

      const tagsRepository = fastify.diContainer.resolve('tagsRepository');
      const tags = await tagsRepository.searchUserTags(q, request.user.userId);

      return reply.send({
        success: true,
        data: tags,
        total: tags.length
      });
    } catch (error) {
      console.error('[TagsRoute] Error searching tags:', error);
      return reply.code(500).send({
        error: 'Failed to search tags',
        message: error.message
      });
    }
  });

  // Create custom tag
  fastify.post('/api/tags/custom', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { tag_name } = request.body;
      if (!tag_name || tag_name.trim().length === 0) {
        return reply.code(400).send({
          error: 'Validation error',
          message: 'Tag name is required'
        });
      }

      if (tag_name.length > 50) {
        return reply.code(400).send({
          error: 'Validation error',
          message: 'Tag name must be 50 characters or less'
        });
      }

      const tagsRepository = fastify.diContainer.resolve('tagsRepository');
      const newTag = await tagsRepository.createCustomTag(
        tag_name.trim(),
        request.user.userId
      );

      return reply.code(201).send({
        success: true,
        message: 'Custom tag created successfully',
        data: newTag
      });
    } catch (error) {
      console.error('[TagsRoute] Error creating custom tag:', error);

      // Check for unique constraint violation
      if (error.message.includes('already exists')) {
        return reply.code(409).send({
          error: 'Conflict',
          message: error.message
        });
      }

      return reply.code(500).send({
        error: 'Failed to create tag',
        message: error.message
      });
    }
  });

  // Get or create tag (used when adding tag to item)
  fastify.post('/api/tags/get-or-create', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { tag_name } = request.body;
      if (!tag_name || tag_name.trim().length === 0) {
        return reply.code(400).send({
          error: 'Validation error',
          message: 'Tag name is required'
        });
      }

      const tagsRepository = fastify.diContainer.resolve('tagsRepository');
      const tag = await tagsRepository.getOrCreateTag(
        tag_name.trim(),
        request.user.userId
      );

      return reply.code(200).send({
        success: true,
        message: 'Tag retrieved or created',
        data: tag
      });
    } catch (error) {
      console.error('[TagsRoute] Error in get-or-create:', error);
      return reply.code(500).send({
        error: 'Failed to get or create tag',
        message: error.message
      });
    }
  });

  // Delete custom tag
  fastify.delete('/api/tags/custom/:tagId', {
    preHandler: [authMiddleware]
  }, async (request, reply) => {
    try {
      if (!request.user || !request.user.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { tagId } = request.params;
      const tagsRepository = fastify.diContainer.resolve('tagsRepository');
      
      const deleted = await tagsRepository.deleteCustomTag(tagId, request.user.userId);

      if (!deleted) {
        return reply.code(404).send({
          error: 'Not found',
          message: 'Tag not found or unauthorized'
        });
      }

      return reply.send({
        success: true,
        message: 'Custom tag deleted successfully'
      });
    } catch (error) {
      console.error('[TagsRoute] Error deleting custom tag:', error);
      
      if (error.message.includes('Unauthorized')) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: error.message
        });
      }

      return reply.code(500).send({
        error: 'Failed to delete tag',
        message: error.message
      });
    }
  });

  // Get global tags
  fastify.get('/api/tags/global', async (request, reply) => {
    try {
      const tagsRepository = fastify.diContainer.resolve('tagsRepository');
      const tags = await tagsRepository.getGlobalTags();

      return reply.send({
        success: true,
        data: tags,
        total: tags.length
      });
    } catch (error) {
      console.error('[TagsRoute] Error getting global tags:', error);
      return reply.code(500).send({
        error: 'Failed to fetch global tags',
        message: error.message
      });
    }
  });
};
