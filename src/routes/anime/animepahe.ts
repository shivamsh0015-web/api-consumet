// @ts-nocheck
import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import axios from 'axios';

// AnimePahe has a JSON API. The @consumet/extensions scraper is Cloudflare-blocked,
// so we call the API directly with proper browser-like headers.

const PAHE_BASE = process.env.ANIMEPAHE_BASE_URL || 'https://animepahe.org';

const paheHeaders = (referer?: string) => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': referer || `${PAHE_BASE}/`,
  'Origin': PAHE_BASE,
});

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro: `Welcome to the animepahe provider (direct API mode). Base: ${PAHE_BASE}`,
      routes: ['/:query', '/info/:id', '/watch'],
      documentation: 'https://docs.consumet.org/#tag/animepahe',
    });
  });

  // Search: GET /anime/animepahe/:query
  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;

    try {
      const { data } = await axios.get(`${PAHE_BASE}/api?m=search&q=${encodeURIComponent(query)}`, {
        headers: paheHeaders(),
        timeout: 10000,
        maxRedirects: 5,
      });

      const items: any[] = data?.data || [];
      const results = items.map((item: any) => ({
        id: item.session,
        title: item.title,
        image: item.poster,
        rating: item.score,
        releaseDate: item.year,
        type: item.type,
        episodes: item.episodes,
        status: item.status,
      }));

      reply.status(200).send({ results });
    } catch (err: any) {
      console.error('[AnimePahe search error]', err.message);
      reply.status(500).send({ message: err.message });
    }
  });

  // Info: GET /anime/animepahe/info/:id  (id = session string)
  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = decodeURIComponent((request.params as { id: string }).id);
    const page = Number((request.query as any).episodePage) || 1;
    const referer = `${PAHE_BASE}/anime/${id}`;

    try {
      // Fetch episode page
      const { data } = await axios.get(
        `${PAHE_BASE}/api?m=release&id=${id}&sort=episode_asc&page=${page}`,
        { headers: paheHeaders(referer), timeout: 15000, maxRedirects: 5 }
      );

      const episodes = (data?.data || []).map((ep: any) => ({
        id: `${id}/${ep.session}`,
        number: ep.episode,
        title: ep.title || null,
        image: ep.snapshot || null,
        duration: ep.duration || null,
      }));

      reply.status(200).send({
        id,
        title: data?.data?.[0]?.anime_title || id,
        episodes,
        totalEpisodes: data?.total || episodes.length,
        currentPage: data?.current_page || page,
        hasNextPage: (data?.current_page || page) < (data?.last_page || 1),
      });
    } catch (err: any) {
      console.error('[AnimePahe info error]', err.message);
      reply.status(500).send({ message: err.message });
    }
  });

  // Watch: GET /anime/animepahe/watch?episodeId=animeSession/episodeSession
  fastify.get('/watch', async (request: FastifyRequest, reply: FastifyReply) => {
    const episodeId = (request.query as { episodeId: string }).episodeId;
    const [animeSession, episodeSession] = (episodeId || '').split('/');

    if (!animeSession || !episodeSession) {
      return reply.status(400).send({ message: 'episodeId must be in format animeSession/episodeSession' });
    }

    const referer = `${PAHE_BASE}/play/${animeSession}/${episodeSession}`;

    try {
      const { data } = await axios.get(
        `${PAHE_BASE}/api?m=links&id=${animeSession}&session=${episodeSession}&p=kwik`,
        { headers: paheHeaders(referer), timeout: 15000, maxRedirects: 5 }
      );

      const rawLinks: any[] = data?.data || [];
      const sources = rawLinks.map((linkGroup: any) => {
        const entries = Object.entries(linkGroup);
        return entries.map(([quality, info]: [string, any]) => ({
          quality,
          url: info?.kwik || info?.url || '',
          isM3U8: false,
        }));
      }).flat();

      reply.status(200).send({ sources });
    } catch (err: any) {
      console.error('[AnimePahe watch error]', err.message);
      reply.status(500).send({ message: err.message });
    }
  });
};

export default routes;
