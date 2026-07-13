import { ApolloData } from '../types/lead';

export type FetchApolloEnrichmentResult =
  | { ok: true; value: ApolloData; apolloDataStr: string }
  | { ok: false; reason: unknown; isMissingKey?: boolean };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchApolloEnrichment(
  email: string,
  linkedin?: string | null
): Promise<FetchApolloEnrichmentResult> {
  const apolloApiKey = process.env.APOLLO_API_KEY;

  if (!apolloApiKey) {
    return { ok: false, reason: 'missing API key', isMissingKey: true };
  }

  const maxRetries = 3;
  let attempt = 0;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

  try {
    while (attempt < maxRetries) {
      attempt++;
      try {
        const apolloRes = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({
            api_key: apolloApiKey,
            email: email,
            linkedin_url: linkedin || undefined,
          }),
          signal: controller.signal,
        });

        if (apolloRes.ok) {
          clearTimeout(timeoutId);
          const apolloJson = await apolloRes.json();
          const apolloRawData = apolloJson; // Save raw data for DB

          const person = apolloJson.person || {};
          const org = person.organization || {};

          const apolloCompressedData = {
            title: person.title,
            seniority: person.seniority,
            primary_phone: person.primary_phone,
            estimated_num_employees: org.estimated_num_employees,
            industry: org.industry,
            technology_names: org.technology_names?.slice(0, 10), // Limit to top 10 to save tokens
          };

          const apolloDataStr = `\nApollo.io Enrichment Data (for context):\n${JSON.stringify(
            apolloCompressedData,
            null,
            2
          )}`;

          return {
            ok: true,
            value: {
              raw_data: apolloRawData,
              compressed_data: apolloCompressedData,
            },
            apolloDataStr,
          };
        } else if (apolloRes.status === 429) {
          if (attempt >= maxRetries) {
             return { ok: false, reason: 'Apollo API rate limit exceeded (429)' };
          }
          await sleep(1000 * attempt);
        } else {
          clearTimeout(timeoutId);
          const text = await apolloRes.text();
          return { ok: false, reason: `Apollo API error: ${text}` };
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw err;
        }
        if (attempt >= maxRetries) {
           return { ok: false, reason: err instanceof Error ? err.message : String(err) };
        }
        await sleep(1000 * attempt);
      }
    }
    return { ok: false, reason: 'Max retries exceeded' };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbortError = err instanceof Error && err.name === 'AbortError';
    if (isAbortError) {
      return { ok: false, reason: 'Apollo API timeout exceeded' };
    } else {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
