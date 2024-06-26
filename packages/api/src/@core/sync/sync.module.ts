import { BullQueueModule } from '@@core/@core-services/queues/queue.module';
import { CompanyModule } from '@crm/company/company.module';
import { ContactModule } from '@crm/contact/contact.module';
import { DealModule } from '@crm/deal/deal.module';
import { EngagementModule } from '@crm/engagement/engagement.module';
import { NoteModule } from '@crm/note/note.module';
import { StageModule } from '@crm/stage/stage.module';
import { TaskModule } from '@crm/task/task.module';
import { UserModule } from '@crm/user/user.module';
import { Module } from '@nestjs/common';
import { AccountModule } from '@ticketing/account/account.module';
import { CollectionModule } from '@ticketing/collection/collection.module';
import { CommentModule } from '@ticketing/comment/comment.module';
import { ContactModule as TContactModule } from '@ticketing/contact/contact.module';
import { TagModule } from '@ticketing/tag/tag.module';
import { TeamModule } from '@ticketing/team/team.module';
import { TicketModule } from '@ticketing/ticket/ticket.module';
import { UserModule as TUserModule } from '@ticketing/user/user.module';
import { LoggerService } from '../@core-services/logger/logger.service';
import { CoreSyncRegistry } from '../@core-services/registries/core-sync.registry';
import { SyncController } from './sync.controller';
import { CoreSyncService } from './sync.service';

@Module({
  imports: [
    BullQueueModule,
    CompanyModule,
    ContactModule,
    DealModule,
    EngagementModule,
    NoteModule,
    StageModule,
    TaskModule,
    UserModule,
    AccountModule,
    CollectionModule,
    CommentModule,
    TContactModule,
    TagModule,
    TeamModule,
    TicketModule,
    TUserModule,
  ],
  providers: [CoreSyncService, CoreSyncRegistry, LoggerService],
  controllers: [SyncController],
})
export class SyncModule {}
