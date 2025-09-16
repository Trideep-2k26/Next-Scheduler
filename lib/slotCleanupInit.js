import slotCleanupService from './services/slotCleanupFixed'


if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SLOT_CLEANUP === 'true') {
  console.log('[App] Starting slot cleanup service...')
  slotCleanupService.start()
}


process.on('SIGTERM', () => {
  console.log('[App] Shutting down slot cleanup service...')
  slotCleanupService.stop()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[App] Shutting down slot cleanup service...')
  slotCleanupService.stop()
  process.exit(0)
})

export default slotCleanupService