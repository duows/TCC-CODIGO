import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { TipoCaracteristica } from '@prisma/client';

export class CreateCaracteristicaDto {
  @IsUUID()
  categoriaId!: string;

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsEnum(TipoCaracteristica)
  tipo!: TipoCaracteristica;
}

/**
 * categoriaId é imutável após a criação: mover uma característica de
 * categoria enquanto componentes já a referenciam não tem semântica definida.
 */
export class UpdateCaracteristicaDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsEnum(TipoCaracteristica)
  tipo!: TipoCaracteristica;
}
