import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CaracteristicasService } from './caracteristicas.service';
import { CreateCaracteristicaDto, UpdateCaracteristicaDto } from './caracteristica.dto';

@Controller('caracteristicas')
export class CaracteristicasController {
  constructor(private readonly service: CaracteristicasService) {}

  @Get()
  async listar() {
    return this.service.listar();
  }

  @Get(':categoriaId')
  async listarPorCategoria(@Param('categoriaId') categoriaId: string) {
    return this.service.listarPorCategoria(categoriaId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async criar(@Body() dto: CreateCaracteristicaDto) {
    return this.service.criar(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async atualizar(@Param('id') id: string, @Body() dto: UpdateCaracteristicaDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletar(@Param('id') id: string) {
    await this.service.deletar(id);
  }
}
