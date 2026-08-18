import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMarcaDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;
}

export class UpdateMarcaDto extends CreateMarcaDto {}
