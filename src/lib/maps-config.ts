/**
 * Google Maps Platform Configuration for HQ16 AquaOS
 * Configures API Provider, map styles, and internal attribution IDs
 */

// Provided by user in metadata/chat
export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCh6YYADhVf6T85EVzuf_FcrkQiORAQY3k';

// Map ID for advanced markers (using DEMO_MAP_ID or custom vector map ID)
export const GOOGLE_MAPS_MAP_ID =
  import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

// Mandatory Usage Attribution
export const INTERNAL_USAGE_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];
