import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  IsPositive
} from "class-validator";
import { Type } from "class-transformer";

class TransactionItemDTO {
  @IsInt()
  @IsPositive()
  productId!: number;

  @IsInt()
  @IsPositive()
  qty!: number;
}

export class CreateTransactionDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDTO)
  payload!: TransactionItemDTO[];
}
