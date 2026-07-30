import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RequestWithContext } from '../../../common/middleware/request-context.middleware';
@Injectable()
export class OrganizationContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const user = request.user;
    if (!user) {
      return false;
    }
    const requestedOrganizationId = request.params.organizationId;
    if (!requestedOrganizationId) {
      return true;
    }
    if (user.roles.includes('SYSTEM_ADMIN')) {
      return true;
    }
    if (user.organizationId !== requestedOrganizationId) {
      throw new ForbiddenException(
        'The requested organization is outside your active access context.',
      );
    }
    return true;
  }
}
