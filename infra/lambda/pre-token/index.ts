// Cognito pre-token-generation trigger: adds role = "authenticated" to ID
// tokens. PostgREST switches into the database role named by this claim, the
// same way it does with Supabase's own tokens.

import type { PreTokenGenerationTriggerHandler } from 'aws-lambda';

export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  event.response.claimsOverrideDetails = {
    claimsToAddOrOverride: { role: 'authenticated' },
  };
  return event;
};
