// Expo only inlines EXPO_PUBLIC_ variables when they are accessed with dot
// notation on process.env, so each one has to be referenced explicitly.
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const cognitoRegion = process.env.EXPO_PUBLIC_COGNITO_REGION;
const cognitoClientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID;
// Optional: points sign-in at a local stand-in for Cognito during tests.
const cognitoEndpoint = process.env.EXPO_PUBLIC_COGNITO_ENDPOINT;

export const missingEnvVars = [
  !apiUrl && 'EXPO_PUBLIC_API_URL',
  !cognitoRegion && 'EXPO_PUBLIC_COGNITO_REGION',
  !cognitoClientId && 'EXPO_PUBLIC_COGNITO_CLIENT_ID',
].filter((name): name is string => Boolean(name));

export const isBackendConfigured = missingEnvVars.length === 0;

export const env = {
  /** The API Gateway URL from the AWS deploy output (PostgREST lives under /rest/v1). */
  apiUrl: (apiUrl ?? '').replace(/\/+$/, ''),
  cognitoClientId: cognitoClientId ?? '',
  cognitoEndpoint: cognitoEndpoint || `https://cognito-idp.${cognitoRegion}.amazonaws.com/`,
};

// Optional. Without it, food search falls back to USDA's shared DEMO_KEY,
// which allows only a handful of searches per hour.
const usdaApiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;

export const foodSearchConfig = {
  usdaApiKey: usdaApiKey || 'DEMO_KEY',
  usingDemoKey: !usdaApiKey,
};
