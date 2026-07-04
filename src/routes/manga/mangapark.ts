// @ts-nocheck
import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { MANGA } from '@consumet/extensions';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  const mangapark = (MANGA as any).Mangapark ? new (MANGA as any).Mangapark() : null;

  fastify.addHook('preHandler', async (request, reply) => {
    if (!mangapark && request.url !== '/') {
      return reply.status(503).send({
        message: 'Mangapark provider is not available in this version of the extensions library.',
        error: 'service_unavailable',
      });
    }
  });

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro: `Welcome to the MangaKakalot provider: check out the provider's website @ ${mangapark.toString.baseUrl}`,
      routes: ['/:query', '/info', '/read'],
      documentation: 'https://docs.consumet.org/#tag/mangakakalot',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;

    const res = await mangapark.search(query);

    reply.status(200).send(res);
  });

  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.query as { id: string }).id;

    if (typeof id === 'undefined')
      return reply.status(400).send({ message: 'id is required' });

    try {
      const res = await mangapark
        .fetchMangaInfo(id)
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

    if (typeof chapterId === 'undefined')
      return reply.status(400).send({ message: 'chapterId is required' });

    try {
      const res = await mangapark
        .fetchChapterPages(chapterId)
        .catch((err: Error) => reply.status(404).send({ message: err.message }));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });
};

export default routes;
