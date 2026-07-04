// @ts-nocheck
import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { LIGHT_NOVELS } from '@consumet/extensions';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  const readlightnovels = (LIGHT_NOVELS as any).ReadLightNovels ? new (LIGHT_NOVELS as any).ReadLightNovels() : null;

  fastify.addHook('preHandler', async (request, reply) => {
    if (!readlightnovels && request.url !== '/') {
      return reply.status(503).send({
        message: 'ReadLightNovels provider is not available in this version of the extensions library.',
        error: 'service_unavailable',
      });
    }
  });

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro:
        "Welcome to the readlightnovels provider: check out the provider's website @ https://readlightnovels.net/",
      routes: ['/:query', '/info', '/read'],
      documentation: 'https://docs.consumet.org/#tag/readlightnovels',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;

    const res = await readlightnovels.search(query);

    reply.status(200).send(res);
  });

  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.query as { id: string }).id;
    const chapterPage = (request.query as { chapterPage: number }).chapterPage;

    if (typeof id === 'undefined') {
      return reply.status(400).send({
        message: 'id is required',
      });
    }

    try {
      const res = await readlightnovels
        .fetchLightNovelInfo(id, chapterPage)
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });

  fastify.get('/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const chapterId = (request.query as { chapterId: string }).chapterId;

    if (typeof chapterId === 'undefined') {
      return reply.status(400).send({
        message: 'chapterId is required',
      });
    }

    try {
      const res = await readlightnovels
        .fetchChapterContent(chapterId)
        .catch((err) => reply.status(404).send(err));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });
};

export default routes;
