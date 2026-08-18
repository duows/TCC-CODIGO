/**
 * Testes unitários do AuthService: comparação de senha e emissão de token.
 */

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

function mkService(adminPassword: string) {
  const config = { get: jest.fn().mockReturnValue(adminPassword) } as unknown as ConfigService;
  const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '4h' } });
  return new AuthService(config, jwt);
}

describe('AuthService', () => {
  it('senha correta devolve um token assinado', async () => {
    const service = mkService('senha-correta');

    const { accessToken } = await service.login('senha-correta');

    expect(typeof accessToken).toBe('string');
    expect(accessToken.split('.')).toHaveLength(3);
  });

  it('senha incorreta lança UnauthorizedException', async () => {
    const service = mkService('senha-correta');

    await expect(service.login('senha-errada')).rejects.toThrow(UnauthorizedException);
  });
});
