import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RestricoesService } from './restricoes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRestricaoDto, UpdateRestricaoDto } from './restricao.dto';

@Controller('restricoes')
export class RestricoesController {
  constructor(private readonly service: RestricoesService) {}

  /**
   * GET /api/restricoes/ajustaveis
   * Lista restrições cujo parametro pode ser sobrescrito pelo usuário
   * (ex.: margem de segurança da fonte). O frontend usa isto para
   * descobrir os ids a enviar em `ajustes` no POST /configurations/validate.
   */
  @Get('ajustaveis')
  async listarAjustaveis() {
    return this.service.listarAjustaveis();
  }

  /**
   * GET /api/restricoes
   * Lista todas as restrições cadastradas (área administrativa).
   */
  @Get()
  async listar() {
    return this.service.listar();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async criar(@Body() dto: CreateRestricaoDto) {
    return this.service.criar(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async atualizar(@Param('id') id: string, @Body() dto: UpdateRestricaoDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletar(@Param('id') id: string) {
    await this.service.deletar(id);
  }
}
