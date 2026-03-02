import type { FastifyInstance } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { getGitLabConfig } from '../../gitlab';

/**
 * Register GitLab git HTTP proxy routes.
 *
 * Proxies all requests under /git-proxy/* to the configured GitLab instance,
 * injecting the server's token as Basic Auth so git clone/push/pull work
 * from any LAN machine without individual token configuration.
 *
 * Usage:
 *   git clone http://10.10.4.161:12306/git-proxy/group/repo.git
 */
export function registerGitLabProxyRoutes(fastify: FastifyInstance): void {
  const config = getGitLabConfig();

  if (!config) {
    return;
  }

  const basicAuth = Buffer.from(`oauth2:${config.privateToken}`).toString('base64');

  fastify.register(httpProxy, {
    upstream: config.baseUrl,
    prefix: '/git-proxy',
    rewritePrefix: '',
    replyOptions: {
      rewriteRequestHeaders: (_originalReq, headers) => ({
        ...headers,
        authorization: `Basic ${basicAuth}`,
      }),
    },
  });
}
