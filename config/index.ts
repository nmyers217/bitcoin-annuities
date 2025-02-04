// Default to 12 hours (43200 seconds) if not configured
export const CACHE_DURATION_SECONDS = parseInt(
  process.env.CACHE_DURATION_SECONDS ?? '43200',
  10
)
