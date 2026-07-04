// @ts-nocheck
import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { ANIME } from '@consumet/extensions';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  if (!process.env.BILIBILI_COOKIE) return;
  const bilibili = (ANIME as any).Bilibili ? new (ANIME as any).Bilibili(process.env.BILIBILI_COOKIE) : null;

  fastify.addHook('preHandler', async (request, reply) => {
    if (!bilibili && request.url !== '/') {
      return reply.status(503).send({
        message: 'Bilibili provider is not available in this version of the extensions library.',
        error: 'service_unavailable',
      });
    }
  });

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro:
        "Welcome to the bilibili provider: check out the provider's website @ https://bilibili.to/",
      routes: ['/:query', '/info/:id', '/watch/:episodeId'],
      documentation: 'https://docs.consumet.org/#tag/bilibili',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;

    const res = await bilibili.search(query);

    reply.status(200).send(res);
  });

  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.query as { id: string }).id;

    if (typeof id === 'undefined')
      return reply.status(400).send({ message: 'id is required' });

    try {
      const res = await bilibili
        .fetchAnimeInfo(id)
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/watch', async (request: FastifyRequest, reply: FastifyReply) => {
    const episodeId = (request.query as { episodeId: string }).episodeId;

    if (typeof episodeId === 'undefined')
      return reply.status(400).send({ message: 'episodeId is required' });

    try {
      const res = await bilibili
        .fetchEpisodeSources(episodeId)
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });
};

export default routes;
