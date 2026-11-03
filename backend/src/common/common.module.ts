import { Global, Module } from '@nestjs/common';
import { ErrorHandlerService } from './error-handler/error-handler.service';
import { ValidationService } from './validation/validation.service';

@Global()
@Module({
  providers: [ErrorHandlerService, ValidationService],
  exports: [ErrorHandlerService, ValidationService],
})
export class CommonModule {}
