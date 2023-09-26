import { Injectable } from '@nestjs/common';
import { convert } from 'html-to-text';
import cheerio from 'cheerio';
import GetUniqueSelector from 'cheerio-get-css-selector';
import writeGood from 'write-good';

@Injectable()
export class AppService {
  async findGrammarSuggestions(/*text: string*/): Promise<any> {
    const testText =
      '<div id="app"><p>stuff stuff</p><p>As a matter of fact,&nbsp;</p><p><br></p><p>&nbsp; &nbsp; &nbsp;&nbsp;</p><p>&nbsp; &nbsp; &nbsp; stuff asd asd</p><p>stuff asd</p><p><br></p></div>';

    const text = testText;
    // const plainText = this.convertHtmlToPlainText(test);
    const plainText = this.convertHtmlToPlainText(testText);

    const suggestions = {
      matches: [],
      stats: {
        score: 0,
        rules: [],
      },
    };

    const resultsAdverb = this.getSuggestionsResults(
      plainText,
      true,
      false,
      false,
    );
    const matchingPositionsAdverbs = this.addMatchingPositions(
      plainText,
      text,
      resultsAdverb,
    );
    if (matchingPositionsAdverbs) {
      const formattedAdverbResults = this.getFormattedResultsAndOccurrences(
        matchingPositionsAdverbs,
        'ADVERB',
      );
      suggestions.matches.push(...formattedAdverbResults.results);
      suggestions.stats.rules.push(formattedAdverbResults.occurrences);
    }

    const resultsPassiveVoice = this.getSuggestionsResults(
      plainText,
      false,
      true,
      false,
    );
    const matchingPositionsPassive = this.addMatchingPositions(
      plainText,
      text,
      resultsPassiveVoice,
    );
    const formattedPassiveVoiceResults = this.getFormattedResultsAndOccurrences(
      matchingPositionsPassive,
      'PASSIVE_VOICE',
    );
    suggestions.matches.push(...formattedPassiveVoiceResults.results);
    suggestions.stats.rules.push(formattedPassiveVoiceResults.occurrences);

    const resultsComplexSentence = this.getSuggestionsResults(
      plainText,
      false,
      false,
      true,
    );
    const matchingPositionsComplexSentence = this.addMatchingPositions(
      plainText,
      text,
      resultsComplexSentence,
    );
    const formattedComplexResults = this.getFormattedResultsAndOccurrences(
      matchingPositionsComplexSentence,
      'COMPLEX_SENTENCE',
    );
    suggestions.matches.push(...formattedComplexResults.results);
    suggestions.stats.rules.push(formattedComplexResults.occurrences);
    suggestions.stats.score = this.calculateScore(
      plainText,
      suggestions.matches.length,
    );
    return suggestions;
  }

  convertHtmlToPlainText(htmlText: string): string {
    return convert(htmlText);
  }

  getSuggestionsResults(
    text: string,
    adverb = false,
    passive = false,
    tooWordy = false,
  ): any[] {
    return writeGood(text, {
      adverb: adverb,
      passive: passive,
      tooWordy: tooWordy,
      weasel: false,
      illusion: false,
      so: false,
      thereIs: false,
      cliches: false,
      eprime: false,
    });
  }

  getFormattedResultsAndOccurrences(
    results: {
      matchingPositions: {
        selector: string;
        index: number;
        offset: number;
        matchingString: string;
      };
      evaluationResult: {
        reason: string;
      };
    }[],
    ruleId: string,
  ): any {
    const formattedResults = {
      results: [],
      occurrences: {},
    };
    for (const result of results) {
      formattedResults.results.push({
        message: result.evaluationResult.reason,
        length: result.matchingPositions.offset,
        index: result.matchingPositions.index,
        selector: result.matchingPositions.selector,
        ruleId,
      });
    }
    formattedResults.occurrences = {
      id: ruleId,
      count: formattedResults.results.length,
    };
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

  addMatchingPositions(
    plainText,
    html,
    evaluationResults,
  ):
    | [
        {
          selector: string; //'#app > p:nth-child(5)'
          index: number;
          offset: number;
          matchingString: string;
        },
      ] {
    console.log('evaluationResults', evaluationResults);
    const matchPositions = [];
    for (const evaluationResult of evaluationResults) {
      const $ = this.loadCheerio(html);
      const textToMatch = this.getTextToMatch(evaluationResult);
      const indexOfOccurrence = this.getIndexOfOcurrence(
        evaluationResult,
        plainText,
        textToMatch,
      );

      const elementsContainingText = this.getElementsContainingText(
        textToMatch,
        $,
      );

      const positionInHTML = elementsContainingText
        .toArray()
        .reduce((mapped, x) => {
          const occurences = [
            ...$(x).text().matchAll(new RegExp(textToMatch, 'g')),
          ].map((e) => ({
            selector: $(x).getUniqueSelector(),
            index: e.index,
            offset: textToMatch.length,
            matchingString: textToMatch,
          }));
          return [...mapped, ...occurences];
        }, []);

      console.log('position', positionInHTML);
      matchPositions.push({
        evaluationResult,
        matchingPositions: positionInHTML[indexOfOccurrence],
      });
    }
    console.log('final result', matchPositions);
    return matchPositions;
  }

  getIndexOfOcurrence(evaluationResult, plaintext, textToMatch) {
    const regex = new RegExp(textToMatch, 'g');
    const textMatches = [...plaintext.matchAll(regex)].map((e) => ({ ...e }));

    return textMatches.findIndex((m) => m.index === evaluationResult.index);
  }

  loadCheerio(html) {
    const $ = cheerio.load(html);
    GetUniqueSelector.init($);
    return $;
  }

  getElementsContainingText(textToMatch, $) {
    return $(`#app > *:icontains("${textToMatch}")`);
  }

  getTextToMatch = (evaluationResult) =>
    evaluationResult.reason.substring(1, evaluationResult.offset + 1);
}
