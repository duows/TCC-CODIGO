import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ComponentsService } from './components.service';

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
}
