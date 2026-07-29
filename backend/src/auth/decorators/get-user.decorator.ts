import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface JwtPayload {
  id: string;
  sub: string;
  email: string;
  role: Role;
}

export const GetUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (data) {
      return request.user?.[data];
    }
    return request.user;
  },
);
