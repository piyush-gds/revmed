/**
 * GraphQL helper – fetches data from AEM persisted‑query endpoints.
 *
 * The publish endpoint is resolved in this order:
 *  1. window.__graphqlEndpoint (if set by another script)
 *  2. A <meta name="graphql-endpoint"> tag in the page <head>
 *  3. The FALLBACK_ORIGIN constant below
 */

const FALLBACK_ORIGIN = 'https://publish-p178131-e1882764.adobeaemcloud.com';
const GRAPHQL_PATH = '/graphql/execute.json/revmed-aem-core';

/**
 * Resolve the base origin for the AEM GraphQL endpoint.
 * @returns {string}
 */
function getEndpointOrigin() {
  if (window.__graphqlEndpoint) return window.__graphqlEndpoint;

  const meta = document.querySelector('meta[name="graphql-endpoint"]');
  if (meta?.content) return meta.content.replace(/\/+$/, '');

  return FALLBACK_ORIGIN;
}

/**
 * Execute an AEM persisted GraphQL query.
 *
 * @param {string} queryPath  – The persisted‑query path, e.g. "/getTrialsTableData"
 * @param {Object} [variables] – Optional variables to append as query‑string params
 * @returns {Promise<Object|null>} The parsed JSON response, or null on failure
 */
export async function fetchGraphQL(queryPath, variables) {
  try {
    const origin = getEndpointOrigin();
    const url = new URL(`${GRAPHQL_PATH}${queryPath}`, origin);

    // Cache‑bust
    url.searchParams.set('q', Date.now());

    // Append any variables
    if (variables && typeof variables === 'object') {
      Object.entries(variables).forEach(([key, value]) => {
        url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    const resp = await fetch(url.href, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!resp.ok) {
      // eslint-disable-next-line no-console
      console.warn(`graphql: HTTP ${resp.status} for ${queryPath}`);
      return null;
    }

    return resp.json();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('graphql: fetch failed', err);
    return null;
  }
}
