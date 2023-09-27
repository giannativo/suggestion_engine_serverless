import { Injectable } from '@nestjs/common';
import { convert } from 'html-to-text';
import cheerio from 'cheerio';
import GetUniqueSelector from 'cheerio-get-css-selector';
import writeGood from 'write-good';

@Injectable()
export class AppService {
  async findGrammarSuggestions(input: string): Promise<any> {
    const html = `<div id="app">${input}</div>`;
    const plainText = this.convertHtmlToPlainText(input);

    const suggestions = {
      matches: [],
      stats: {
        score: 0,
        rules: [],
      },
    };

    const adverbResults = this.evaluateAdverbs(plainText, html);

    if (adverbResults) {
      suggestions.matches.push(...adverbResults.results);
      suggestions.stats.rules.push(adverbResults.occurrences);
    }

    const passiveVoiceResults = this.evaluatePassiveVoice(plainText, html);

    if (passiveVoiceResults) {
      suggestions.matches.push(...passiveVoiceResults.results);
      suggestions.stats.rules.push(passiveVoiceResults.occurrences);
    }

    const complexSentenceResults = this.evaluateComplexSentence(
      plainText,
      html,
    );

    if (complexSentenceResults) {
      suggestions.matches.push(...complexSentenceResults.results);
      suggestions.stats.rules.push(complexSentenceResults.occurrences);
    }

    suggestions.stats.score = this.calculateScore(
      plainText,
      suggestions.matches.length,
    );
    return suggestions;
  }

  convertHtmlToPlainText(htmlText: string): string {
    return convert(htmlText, {
      selectors: [
        { selector: 'h1', options: { uppercase: false } },
        { selector: 'h2', options: { uppercase: false } },
        { selector: 'h3', options: { uppercase: false } },
        { selector: 'h4', options: { uppercase: false } },
        { selector: 'h5', options: { uppercase: false } },
        { selector: 'h6', options: { uppercase: false } },
        {
          selector: 'table',
          format: 'dataTable',
          options: {
            uppercaseHeaderCells: false,
          },
        },
      ],
    });
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

  addMatchingPositions(plainText, html, evaluationResults) {
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
            selector: $(x).getUniqueSelector().substring(7),
            index: e.index,
            offset: textToMatch.length,
            matchingString: textToMatch,
          }));

          return [...mapped, ...occurences];
        }, []);

      matchPositions.push({
        evaluationResult,
        matchingPositions: positionInHTML[indexOfOccurrence],
      });
    }
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

  evaluateAdverbs(plainText, html) {
    const resultsAdverb = this.getSuggestionsResults(
      plainText,
      true,
      false,
      false,
    );
    const matchingPositionsAdverbs = this.addMatchingPositions(
      plainText,
      html,
      resultsAdverb,
    );
    return this.getFormattedResultsAndOccurrences(
      matchingPositionsAdverbs,
      'ADVERB',
    );
  }

  evaluatePassiveVoice(plainText, html) {
    const resultsPassiveVoice = this.getSuggestionsResults(
      plainText,
      false,
      true,
      false,
    );
    const matchingPositionsPassive = this.addMatchingPositions(
      plainText,
      html,
      resultsPassiveVoice,
    );
    return this.getFormattedResultsAndOccurrences(
      matchingPositionsPassive,
      'PASSIVE_VOICE',
    );
  }

  evaluateComplexSentence(plainText, html) {
    const resultsComplexSentence = this.getSuggestionsResults(
      plainText,
      false,
      false,
      true,
    );
    const matchingPositionsComplexSentence = this.addMatchingPositions(
      plainText,
      html,
      resultsComplexSentence,
    );
    return this.getFormattedResultsAndOccurrences(
      matchingPositionsComplexSentence,
      'COMPLEX_SENTENCE',
    );
  }
}
