import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { SendTextDto } from './dtos/send-text.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async getHello(@Body() body: SendTextDto): Promise<Object> {
    return await this.appService.findGrammarSuggestions(body.text);
  }
}
