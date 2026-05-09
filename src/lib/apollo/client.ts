import { ApolloData } from '@/lib/types';

export interface ApolloEnrichmentResult {
  dataStr: string;
  rawData: any | null;
  compressedData: ApolloData['compressed_data'] | null;
  failed: boolean;
}

const sleep = (ms: number, signal?: AbortSignal) => new Promise((resolve, reject) => {
  if (signal?.aborted) {
    return reject(new Error('AbortError'));
  }

  const timer = setTimeout(() => {
    if (signal) signal.removeEventListener('abort', abortHandler);
    resolve(undefined);
  }, ms);

  const abortHandler = () => {
    clearTimeout(timer);
    reject(new Error('AbortError'));
  };

  if (signal) {
    signal.addEventListener('abort', abortHandler);
  }
});

export async function fetchApolloEnrichment(
  email: string,
  linkedin?: string | null
): Promise<ApolloEnrichmentResult> {
  const apolloApiKey = process.env.APOLLO_API_KEY;

  if (!apolloApiKey) {
    return { dataStr: '', rawData: null, compressedData: null, failed: true };
  }

  const MAX_RETRIES = 2;
  let attempt = 0;

  // 10 second overall timeout for Apollo enrichment
  const controller = new AbortController();
  const overallTimeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    while (attempt <= MAX_RETRIES) {
      try {
        const apolloRes = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            api_key: apolloApiKey,
            email: email,
            linkedin_url: linkedin || undefined
          }),
          signal: controller.signal
        });

        if (apolloRes.ok) {
          const apolloJson = await apolloRes.json();
          const person = apolloJson.person || {};
          const org = person.organization || {};

          const compressedData = {
            title: person.title,
            seniority: person.seniority,
            primary_phone: person.primary_phone,
            estimated_num_employees: org.estimated_num_employees,
            industry: org.industry,
            technology_names: org.technology_names?.slice(0, 10)
          };

          const dataStr = `\nApollo.io Enrichment Data (for context):\n${JSON.stringify(compressedData, null, 2)}`;

          clearTimeout(overallTimeoutId);
          return {
            dataStr,
            rawData: apolloJson,
            compressedData,
            failed: false
          };
        } else if (apolloRes.status === 429) {
          // Rate limit hit
          if (attempt < MAX_RETRIES) {
            const retryAfter = apolloRes.headers.get('Retry-After');
            let delayMs = 1000 * Math.pow(2, attempt); // Exponential backoff: 1000ms, 2000ms

            if (retryAfter) {
              const parsedRetryAfter = parseInt(retryAfter, 10);
              if (!isNaN(parsedRetryAfter)) {
                // Retry-After is usually in seconds
                delayMs = parsedRetryAfter * 1000;
              }
            }
            console.warn(`Apollo API rate limited (429). Retrying in ${delayMs}ms...`);
            await sleep(delayMs, controller.signal);
            attempt++;
            continue;
          } else {
            console.warn('Apollo API error: Max retries reached for 429.');
            clearTimeout(overallTimeoutId);
            return { dataStr: '', rawData: null, compressedData: null, failed: true };
          }
        } else {
          console.warn('Apollo API error:', await apolloRes.text());
          clearTimeout(overallTimeoutId);
          return { dataStr: '', rawData: null, compressedData: null, failed: true };
        }
      } catch (err: unknown) {
        const isAbortError = err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError');

        if (isAbortError) {
          // Timeout reached, fail fast
          console.warn('Apollo API timeout exceeded (10s overall timeout).');
          clearTimeout(overallTimeoutId);
          return { dataStr: '', rawData: null, compressedData: null, failed: true };
        }

        // Treat as network error, fail fast as per instructions
        console.error('Network error or unexpected error fetching from Apollo:', err);
        clearTimeout(overallTimeoutId);
        return { dataStr: '', rawData: null, compressedData: null, failed: true };
      }
    }
  } finally {
    clearTimeout(overallTimeoutId);
  }

  return { dataStr: '', rawData: null, compressedData: null, failed: true };
}
