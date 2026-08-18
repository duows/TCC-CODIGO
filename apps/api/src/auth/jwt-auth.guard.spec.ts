/**
 * Testes unitários do JwtAuthGuard: aceita/rejeita conforme o header
 * Authorization, sem depender de um app HTTP real.
 */

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function mkContext(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '4h' } });
  const guard = new JwtAuthGuard(jwt);

  it('sem header authorization lança 401', async () => {
    await expect(guard.canActivate(mkContext({}))).rejects.toThrow(UnauthorizedException);
  });

  it('header sem prefixo Bearer lança 401', async () => {
    const token = await jwt.signAsync({ role: 'admin' });
    await expect(guard.canActivate(mkContext({ authorization: token }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('token inválido lança 401', async () => {
    await expect(
      guard.canActivate(mkContext({ authorization: 'Bearer token-invalido' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('token expirado lança 401', async () => {
    const jwtExpirado = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '-1s' } });
    const token = await jwtExpirado.signAsync({ role: 'admin' });
    await expect(guard.canActivate(mkContext({ authorization: `Bearer ${token}` }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('token válido resolve true', async () => {
    const token = await jwt.signAsync({ role: 'admin' });
    await expect(guard.canActivate(mkContext({ authorization: `Bearer ${token}` }))).resolves.toBe(
      true,
    );
  });
});
