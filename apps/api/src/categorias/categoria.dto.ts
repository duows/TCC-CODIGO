import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsInt()
  @Min(1)
  ordem!: number;
}

export class UpdateCategoriaDto extends CreateCategoriaDto {}
