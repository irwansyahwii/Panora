import { Injectable } from '@nestjs/common';
import { IUserService } from '@crm/user/types';
import {
  CrmObject,
  HubspotUserInput,
  HubspotUserOutput,
  commonHubspotProperties,
} from '@crm/@utils/@types';
import axios from 'axios';
import { PrismaService } from '@@core/prisma/prisma.service';
import { LoggerService } from '@@core/logger/logger.service';
import { ActionType, handleServiceError } from '@@core/utils/errors';
import { EncryptionService } from '@@core/encryption/encryption.service';
import { ApiResponse } from '@@core/utils/types';
import { ServiceRegistry } from '../registry.service';

@Injectable()
export class HubspotService implements IUserService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private cryptoService: EncryptionService,
    private registry: ServiceRegistry,
  ) {
    this.logger.setContext(
      CrmObject.user.toUpperCase() + ':' + HubspotService.name,
    );
    this.registry.registerService('hubspot', this);
  }
  async addUser(
    userData: HubspotUserInput,
    linkedUserId: string,
  ): Promise<ApiResponse<HubspotUserOutput>> {
    try {
      //TODO: check required scope  => crm.objects.users.write
      const connection = await this.prisma.connections.findFirst({
        where: {
          id_linked_user: linkedUserId,
          provider_slug: 'hubspot',
        },
      });
      const dataBody = {
        properties: userData,
      };
      const resp = await axios.post(
        `https://api.hubapi.com/crm/v3/objects/users/`,
        JSON.stringify(dataBody),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.cryptoService.decrypt(
              connection.access_token,
            )}`,
          },
        },
      );
      return {
        data: resp.data,
        message: 'Hubspot user created',
        statusCode: 201,
      };
    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        'Hubspot',
        CrmObject.user,
        ActionType.POST,
      );
    }
  }

  async syncUsers(
    linkedUserId: string,
    custom_properties?: string[],
  ): Promise<ApiResponse<HubspotUserOutput[]>> {
    try {
      //TODO: check required scope  => crm.objects.users.READ
      const connection = await this.prisma.connections.findFirst({
        where: {
          id_linked_user: linkedUserId,
          provider_slug: 'hubspot',
        },
      });

      const commonPropertyNames = Object.keys(commonHubspotProperties);
      const allProperties = [...commonPropertyNames, ...custom_properties];
      const baseURL = 'https://api.hubapi.com/crm/v3/objects/users/';

      const queryString = allProperties
        .map((prop) => `properties=${encodeURIComponent(prop)}`)
        .join('&');

      const url = `${baseURL}?${queryString}`;

      const resp = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cryptoService.decrypt(
            connection.access_token,
          )}`,
        },
      });
      this.logger.log(`Synced hubspot users !`);

      return {
        data: resp.data.results,
        message: 'Hubspot users retrieved',
        statusCode: 200,
      };
    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        'Hubspot',
        CrmObject.user,
        ActionType.GET,
      );
    }
  }
}
