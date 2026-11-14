import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  number: string;

  @IsMongoId()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  concept: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @Matches(DATE_FORMAT, { message: 'issueDate debe tener formato AAAA-MM-DD' })
  issueDate: string;

  @Matches(DATE_FORMAT, { message: 'dueDate debe tener formato AAAA-MM-DD' })
  dueDate: string;
}
