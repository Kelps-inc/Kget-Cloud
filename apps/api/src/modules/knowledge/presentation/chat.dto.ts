import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({
    example: "What are the payment terms mentioned in the document?",
  })
  @IsString()
  @MinLength(1)
  content: string;
}
