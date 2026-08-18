import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * Admin único, sem tabela de usuários (RNF de escopo: sem sistema de contas).
 * A senha vem de ADMIN_PASSWORD (env) e é comparada via digest SHA-256 +
 * timingSafeEqual para evitar um side-channel de tempo na comparação — não
 * há hash armazenado para proteger (a senha em si já vive em uma env var no
 * mesmo nível de confiança do JWT_SECRET), então bcrypt não agrega nada aqui.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  private validarSenha(senha: string): boolean {
    const esperada = this.config.get<string>('ADMIN_PASSWORD') ?? '';
    const digestRecebido = createHash('sha256').update(senha).digest();
    const digestEsperado = createHash('sha256').update(esperada).digest();
    return timingSafeEqual(digestRecebido, digestEsperado);
  }

  async login(senha: string): Promise<{ accessToken: string }> {
    if (!this.validarSenha(senha)) {
      throw new UnauthorizedException('Senha incorreta');
    }
    const accessToken = await this.jwt.signAsync({ role: 'admin' });
    return { accessToken };
  }
}
