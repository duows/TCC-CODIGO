import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { OperadorRestricao } from '@prisma/client';

export class CreateRestricaoDto {
  @IsUUID()
  caracteristica1Id!: string;

  @IsUUID()
  caracteristica2Id!: string;

  @IsEnum(OperadorRestricao)
  operador!: OperadorRestricao;

  @IsOptional()
  @IsString()
  parametro?: string;

  @IsString()
  @IsNotEmpty()
  templateJustificativa!: string;
}

export class UpdateRestricaoDto extends CreateRestricaoDto {}
