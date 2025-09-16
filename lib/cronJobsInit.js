import cronJobsService from './services/cronJobs'


if (typeof window === 'undefined') {
  
  cronJobsService.startAllJobs().catch(error => {
    console.error('[CronJobsInit] Failed to start cron jobs:', error)
  })

  
  const shutdown = async () => {
    console.log('[CronJobsInit] Shutting down cron jobs...')
    await cronJobsService.stopAllJobs()
    process.exit(0)
  }

  
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  process.on('SIGUSR2', shutdown) 
}

console.log('[CronJobsInit] Cron jobs initialization module loaded')

export default cronJobsService