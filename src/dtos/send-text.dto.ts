import { IsString } from "class-validator";

export class SendTextDto {
    @IsString()
    text: string;
}