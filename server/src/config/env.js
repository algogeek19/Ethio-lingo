import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_JWKS_URL: process.env.GOOGLE_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',
  SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL || 'https://ohiwmjqheitytulhfdpo.supabase.co/auth/v1/.well-known/jwks.json',
  // GeezSMS (announcements are delivered via SMS instead of in-app banners)
  GEEZSMS_BASE_URL: process.env.GEEZSMS_BASE_URL || 'https://api.geezsms.com/api/v1',
  GEEZSMS_TOKEN: process.env.GEEZSMS_TOKEN || '',
  GEEZSMS_SENDER_ID: process.env.GEEZSMS_SENDER_ID || '',
  // Mailtrap (transactional email — verification codes). Intentionally empty:
  // the token is supplied at deploy time, never committed. While it is unset,
  // email verification codes cannot be delivered, so a password signup cannot
  // be verified. See server/src/services/emailService.js.
  MAILTRAP_TOKEN: process.env.MAILTRAP_TOKEN || '',
  MAILTRAP_FROM_EMAIL: process.env.MAILTRAP_FROM_EMAIL || '',
  MAILTRAP_FROM_NAME: process.env.MAILTRAP_FROM_NAME || 'Ethio-Lingo',
  MAILTRAP_HOST: process.env.MAILTRAP_HOST || 'https://send.api.mailtrap.io',
  // Allowed browser origins for the credentialed API.
  //
  // This list is ADDITIVE, not a replacement: the project's own frontends and
  // dev servers below are always allowed, and CORS_ORIGIN only *adds* more.
  // That matters because the frontend is a separate Render static site
  // (ethio-lingo-w1bc.onrender.com) from the API (ethio-lingo.onrender.com).
  // When the env var used to replace this list, forgetting to add a new
  // Render service name there blocked that site's every API call — the
  // browser drops the response with no error, so the landing page silently
  // fell back to its build-time video and looked misconfigured.
  //
  // To allow an extra origin, append it to CORS_ORIGIN (comma-separated).
  CORS_ORIGIN: [
    // Always allowed: this project's deployed frontends and local dev servers.
    'https://ethio-lingo-w1bc.onrender.com',
    'https://ethio-lingo.onrender.com',
    'https://birrend.onrender.com',
    'https://birrendserver.onrender.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    // Additional origins supplied by the environment.
    ...(process.env.CORS_ORIGIN || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ].filter((origin, index, all) => all.indexOf(origin) === index),
};
