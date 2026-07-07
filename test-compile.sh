#!/bin/bash
npx tsc --noEmit src/lib/types/lead.ts src/lib/apollo/client.ts src/lib/ai/gemini.ts src/lib/email/sender.ts src/lib/db/queries.ts
