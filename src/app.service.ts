import { Injectable } from '@nestjs/common';
import { stripHtml } from 'string-strip-html';
var writeGood = require('write-good');

@Injectable()
export class AppService {
  async findGrammarSuggestions(text: string): Promise<Object> {
    let plainText = this.convertHtmlToPlainText(text);
    let suggestions = {
      "matches": [],
      "stats": {
        "score": 0,
        "rules": []
      }
    };
    const resultsAdverb = this.getSuggestionsResults(text, true, false, false);
    const formattedAdverbResults = this.getFormattedResultsAndOccurrences(resultsAdverb, {
      "id": "ADVERB",
      "description": "An adverb is found.",
      "shortMessage": "Adverb found."
    }, plainText);
    suggestions.matches.push(...formattedAdverbResults.results);
    suggestions.stats.rules.push(formattedAdverbResults.occurrences);
    const resultsPassiveVoice = this.getSuggestionsResults(text, false, true, false);
    const formattedPassiveVoiceResults = this.getFormattedResultsAndOccurrences(resultsPassiveVoice, {
      "id": "PASSIVE_VOICE",
      "description": "Use of passive voice was found.",
      "shortMessage": "Passive voice found."
    }, plainText);
    suggestions.matches.push(...formattedPassiveVoiceResults.results);
    suggestions.stats.rules.push(formattedPassiveVoiceResults.occurrences);
    const resultsComplexSentence = this.getSuggestionsResults(text, false, false, true);
    const formattedComplexResults = this.getFormattedResultsAndOccurrences(resultsComplexSentence, {
      "id": "COMPLEX_SENTENCE",
      "description": "The sentence is too complex.",
      "shortMessage": "Complex sentence found."
    }, plainText);
    suggestions.matches.push(...formattedComplexResults.results);
    suggestions.stats.rules.push(formattedComplexResults.occurrences);
    suggestions.stats.score = this.calculateScore(plainText, suggestions.matches.length);
    return suggestions;
  }

  convertHtmlToPlainText(htmlText: string): string {
    return stripHtml(htmlText).result;
  }

  getSuggestionsResults(text: string, abverb: boolean=false, passive: boolean=false, tooWordy: boolean=false): any[] {
    return writeGood(text, { 
      adverb: abverb,
      passive: passive,
      tooWordy: tooWordy,
      weasel: false,
      illusion: false,
      so: false,
      thereIs: false,
      cliches: false,
      eprime: false
    });
  }

  getFormattedResultsAndOccurrences(results: any[], rule: any, text: string): any {
    let formattedResults = {
      "results": [],
      "occurrences": {}
    }
    for (let result of results) {
      formattedResults.results.push({
        "message": result.reason,
        "shortMessage": rule.shortMessage,
        "offset": result.index,
        "length": result.offset,
        "sentence": text,
        "rule": {
          "id": rule.id,
          "description": rule.description
        }
      })
    };
    formattedResults.occurrences = {
      "id": rule.id,
      "count": formattedResults.results.length
    }
    return formattedResults;
  }

  calculateScore(inputText: string, errorCount: number): number {
    const baseScore = 10;
    const words = inputText.split(/\s+/).length;
    const minimumErrorPenalty = baseScore / words;
    const errorPenalty = errorCount * minimumErrorPenalty;
    const finalScore = Math.max(baseScore - errorPenalty, minimumErrorPenalty);
    return Number(finalScore.toFixed(2));
  }
}
