import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'ABC Constructions Pvt Ltd' })
  @IsString()
  @MinLength(3)
  firmName: string;

  @ApiProperty({ example: 'abc-constructions', description: 'URL-safe unique identifier for your firm' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, and hyphens only' })
  @MinLength(3)
  @MaxLength(50)
  firmSlug: string;

  @ApiProperty({ example: 'Rajan Kumar' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'rajan@abcconstructions.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: ['en', 'hi', 'ta', 'te', 'ar'], required: false })
  @IsOptional()
  @IsIn(['en', 'hi', 'ta', 'te', 'ar'])
  language?: string;
}
