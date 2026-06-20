import { Controller, Get } from '@nestjs/common';
import { CategoriasService } from './categorias.service';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}

  /**
   * GET /api/categorias
   * Retorna todas as categorias ordenadas pela sequência do wizard.
   */
  @Get()
  async listar() {
    return this.service.listar();
  }
}
