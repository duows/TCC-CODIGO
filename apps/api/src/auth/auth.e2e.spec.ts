/**
 * Teste de integração HTTP: prova que o guard realmente compõe sobre o
 * pipeline real (header parsing, binding rota→guard, ValidationPipe global),
 * algo que os testes unitários de AuthService/JwtAuthGuard não cobrem.
 *
 * PrismaService é mockado — nenhum Postgres real é necessário.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from './auth.module';
import { MarcasModule } from '../marcas/marcas.module';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_PASSWORD = 'senha-de-teste';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
    process.env.JWT_SECRET = 'segredo-de-teste-com-32-caracteres-ou-mais';
    process.env.JWT_EXPIRES_IN = '4h';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, MarcasModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        marca: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: 'm1', nome: 'Nova Marca' }),
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('senha correta em POST /auth/login devolve um token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ senha: ADMIN_PASSWORD });

    expect(res.status).toBe(201);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('senha incorreta em POST /auth/login devolve 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ senha: 'senha-errada' });

    expect(res.status).toBe(401);
  });

  it('rota pública GET /marcas responde sem token', async () => {
    const res = await request(app.getHttpServer()).get('/api/marcas');
    expect(res.status).toBe(200);
  });

  it('rota de escrita POST /marcas sem token devolve 401', async () => {
    const res = await request(app.getHttpServer()).post('/api/marcas').send({ nome: 'Teste' });
    expect(res.status).toBe(401);
  });

  it('rota de escrita POST /marcas com token válido funciona', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ senha: ADMIN_PASSWORD });
    const token = login.body.accessToken;

    const res = await request(app.getHttpServer())
      .post('/api/marcas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Nova Marca' });

    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Nova Marca');
  });
});
