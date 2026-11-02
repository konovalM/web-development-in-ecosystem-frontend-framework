import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
@Catch(QueryFailedError)
export class DatabaseErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseErrorFilter.name);
  catch(error: QueryFailedError, host: ArgumentsHost) {
    const e = error.driverError as { code?: string; constraint?: string };
    let status = 500,
      message = 'Внутренняя ошибка базы данных';
    if (e.code === '23505') {
      status = 409;
      message = 'Такая запись уже существует';
    }
    if (e.code === '23503') {
      status = 409;
      message = 'Запись связана с другими данными и не может быть удалена';
      if (['fk_vt_tag', 'fk_pi_video'].includes(e.constraint ?? '')) {
        status = 400;
        message = 'Указан несуществующий тег или видео';
      }
    }
    if (e.code === '23514') {
      status = 400;
      message = 'Данные нарушают ограничения базы';
    }
    if (status === 500) this.logger.error('Unhandled database error', e.code);
    host
      .switchToHttp()
      .getResponse()
      .status(status)
      .json({
        statusCode: status,
        message,
        error:
          status === 409
            ? 'Conflict'
            : status === 400
              ? 'Bad Request'
              : 'Internal Server Error',
      });
  }
}
