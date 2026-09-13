import { Body, Controller, Delete, Get, Param, NotFoundException, Post, Put, UseGuards } from '@nestjs/common';
import { ComponentsService } from './components.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateComponenteDto, UpdateComponenteDto } from './component.dto';

@Controller('components')
export class ComponentsController {
  constructor(private readonly service: ComponentsService) {}

  /**
   * GET /api/components/:categoriaId
   * RF-01 — Listar componentes por categoria.
   * O parâmetro é o UUID da categoria (lido de GET /api/categorias).
   */
  @Get(':categoriaId')
  async listar(@Param('categoriaId') categoriaId: string) {
    return this.service.listarPorCategoriaId(categoriaId);
  }

  /**
   * GET /api/components/:categoriaId/:id
   * RF-04 — Exibir especificações técnicas de um componente.
   */
  @Get(':categoriaId/:id')
  async buscar(@Param('id') id: string) {
    const componente = await this.service.buscarPorId(id);
    if (!componente) throw new NotFoundException(`Componente ${id} não encontrado`);
    return componente;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async criar(@Body() dto: CreateComponenteDto) {
    return this.service.criar(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async atualizar(@Param('id') id: string, @Body() dto: UpdateComponenteDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletar(@Param('id') id: string) {
    await this.service.deletar(id);
  }
}
