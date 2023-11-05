import { Inject, Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { LoggerFactory } from '../../shared/services/logger-factory.service';
import { TypeOrmError } from '../../shared/services/typeorm-error.service';
import { examplesConfig } from '../config/examples.config';
import { FindExampleByIdRequest } from '../dtos/find-example-by-id-request.dto';
import { UpdateExampleRequest } from '../dtos/update-example-request.dto';
import { UpdateExampleResponse } from '../dtos/update-example-response.dto';
import { ExampleWithNameAlreadyExistsException } from '../exceptions/example-with-name-already-exists.exception';
import { ExampleEntity } from '../persistence/example.entity';
import { ExampleRepository } from '../repositories/example.repository';
import { ExampleFinderById } from './example-finder-by-id.service';

const { updater, repository } = examplesConfig;
const { repositoryInterface } = repository;
const { className } = updater.constants;
const { requestLog } = updater.logs;

const logger = LoggerFactory.create(className);

@Injectable()
export class ExampleUpdater {
	constructor(
		@Inject(repositoryInterface) private readonly repository: ExampleRepository,
		private readonly finder: ExampleFinderById,
	) {}

	async run(request: UpdateExampleRequest): Promise<UpdateExampleResponse> {
		logger.log(requestLog);

		const currentExample = await this.getCurrentExample(request.id);

		try {
			const updatedExample = await this.repository.update(currentExample, request);

			return UpdateExampleResponse.create(updatedExample);
		} catch (error) {
			if (TypeOrmError.isUnique(error as QueryFailedError)) {
				throw new ExampleWithNameAlreadyExistsException(request.name);
			}
			logger.error(error);
			throw error;
		}
	}

	private async getCurrentExample(id: string): Promise<ExampleEntity> {
		const request = FindExampleByIdRequest.create(id);

		return (await this.finder.run(request)) as ExampleEntity;
	}
}
