import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { SyncService } from './sync.service';
import { Queues } from '@@core/@core-services/queues/types';

@Processor(Queues.SYNC_JOBS_WORKER)
export class SyncProcessor {
  constructor(private syncService: SyncService) {}

  @Process('ats-sync-jobs')
  async handleSyncJobs(job: Job) {
    try {
      console.log(`Processing queue -> ats-sync-jobs ${job.id}`);
      await this.syncService.syncJobs();
    } catch (error) {
      console.error('Error syncing ats jobs', error);
    }
  }
}
