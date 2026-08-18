import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCategoriaDto, UpdateCategoriaDto } from './categoria.dto';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly service: CategoriasService) { }

  /**
   * GET /api/categorias
   * Retorna todas as categorias ordenadas pela sequência do wizard.
   */
  @Get()
  async listar() {
    return this.service.listar();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async criar(@Body() dto: CreateCategoriaDto) {
    return this.service.criar(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async atualizar(@Param('id') id: string, @Body() dto: UpdateCategoriaDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletar(@Param('id') id: string) {
    await this.service.deletar(id);
  }
}