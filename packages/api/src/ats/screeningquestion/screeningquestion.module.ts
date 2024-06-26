import { EncryptionService } from '@@core/@core-services/encryption/encryption.service';
import { LoggerService } from '@@core/@core-services/logger/logger.service';
import { WebhookService } from '@@core/@core-services/webhooks/panora-webhooks/webhook.service';
import { ConnectionUtils } from '@@core/connections/@utils';
import { FieldMappingService } from '@@core/field-mapping/field-mapping.service';
import { Module } from '@nestjs/common';
import { ScreeningQuestionController } from './screeningquestion.controller';
import { ServiceRegistry } from './services/registry.service';
import { ScreeningQuestionService } from './services/screeningquestion.service';
import { SyncService } from './sync/sync.service';

@Module({
  controllers: [ScreeningQuestionController],
  providers: [
    ScreeningQuestionService,
    LoggerService,
    SyncService,
    WebhookService,
    EncryptionService,
    FieldMappingService,
    ServiceRegistry,
    ConnectionUtils,
    /* PROVIDERS SERVICES */
  ],
  exports: [SyncService],
})
export class ScreeningQuestionModule {}
