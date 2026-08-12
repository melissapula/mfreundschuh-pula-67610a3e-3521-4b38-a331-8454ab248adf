import { IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TaskCategory, TaskStatus } from '../enums/task.enum';

/**
 * All fields optional for PATCH-style partial updates. Defined independently
 * of CreateTaskDto (rather than via @nestjs/mapped-types) so this lib stays
 * free of Nest-specific packages — it's imported by the Angular app too.
 */
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsInt()
  order?: number;
}
