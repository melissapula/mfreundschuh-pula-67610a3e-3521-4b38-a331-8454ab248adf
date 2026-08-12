import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('lets @Public() routes through without invoking the passport strategy', () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);

    // Spy on the actual base-class prototype in this instance's chain (not a
    // fresh AuthGuard('jwt') call, which returns a different mixin class
    // each time and wouldn't be the class JwtAuthGuard actually extends).
    const basePrototype = Object.getPrototypeOf(Object.getPrototypeOf(guard));
    const superSpy = jest.spyOn(basePrototype, 'canActivate').mockReturnValue(false);

    expect(guard.canActivate(makeContext())).toBe(true);
    expect(superSpy).not.toHaveBeenCalled();

    superSpy.mockRestore();
  });

  it('delegates non-public routes to the passport JWT strategy', () => {
    const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);

    const basePrototype = Object.getPrototypeOf(Object.getPrototypeOf(guard));
    const superSpy = jest.spyOn(basePrototype, 'canActivate').mockReturnValue(true);

    expect(guard.canActivate(makeContext())).toBe(true);
    expect(superSpy).toHaveBeenCalledTimes(1);

    superSpy.mockRestore();
  });
});
