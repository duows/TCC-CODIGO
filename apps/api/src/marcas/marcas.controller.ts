import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MarcasService } from './marcas.service';
import { CreateMarcaDto, UpdateMarcaDto } from './marca.dto';

@Controller('marcas')
export class MarcasController {
  constructor(private readonly service: MarcasService) {}

  @Get()
  async listar() {
    return this.service.listar();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async criar(@Body() dto: CreateMarcaDto) {
    return this.service.criar(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async atualizar(@Param('id') id: string, @Body() dto: UpdateMarcaDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletar(@Param('id') id: string) {
    await this.service.deletar(id);
  }
}
