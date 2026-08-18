import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';

export class ComponenteCaracteristicaValorDto {
  @IsUUID()
  caracteristicaId!: string;

  @IsString()
  valor!: string;
}

export class CreateComponenteDto {
  @IsUUID()
  categoriaId!: string;

  @IsUUID()
  marcaId!: string;

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponenteCaracteristicaValorDto)
  caracteristicas!: ComponenteCaracteristicaValorDto[];
}

export class UpdateComponenteDto extends CreateComponenteDto {}
