/**
 * @typedef {import('./extension').Extension} Extension
 * @typedef {import('../index').LhResult} LhResult
 */

/**
 * Extend `lhResult` with a new category.
 *
 * @param {Extension} ext
 * @param {LhResult} lhResult
 * @param {LhResult} defaultResult
 * @return {LhResult}
 */

exports.extendResultWithExthouseCategory = (ext, lhResult, defaultResult) => {
  return {
    ...lhResult,
    runWarnings: lhResult.runWarnings.filter(warning => warning.includes('Chrome extensions')),
    audits: {
      ...lhResult.audits,
      'exthouse-new-long-tasks': {
        id: 'exthouse-new-long-tasks',
        title: 'New Long Tasks',
        description:
          'Long Tasks are CPU events that block the execution for longer than 50ms. They negatively impact on user experience.',
        score: 0.28,
        scoreDisplayMode: 'numeric',
        numericValue: 760,
        displayValue: '760 ms',
        details: {
          type: 'table',
          headings: [
            {
              key: 'task',
              itemType: 'text',
              text: 'Task start time'
            },
            {
              key: 'duration',
              itemType: 'text',
              text: 'Duration'
            }
          ],
          items: [
            {
              task: '1200 ms',
              duration: '350 ms'
            },
            {
              task: '2800 ms',
              duration: '120 ms'
            },
            {
              task: '3500 ms',
              duration: '80 ms'
            }
          ]
        }
      },
      'exthouse-max-potenctialfid-change': {
        id: 'exthouse-max-potenctialfid-change',
        title: 'Max Potencial FID change',
        description: '',
        score: 0.64,
        scoreDisplayMode: 'numeric',
        numericValue: 560,
        displayValue: '560 ms'
      },
      'exthouse-scripting': {
        id: 'exthouse-scripting',
        title: 'New scripting files',
        description: '',
        score: null,
        scoreDisplayMode: 'informative',
        numericValue: 1,
        displayValue: '1 file',
        details: {
          type: 'table',
          headings: [
            {
              key: 'url',
              itemType: 'url',
              text: 'URL'
            },
            {
              key: 'total',
              granularity: 1,
              itemType: 'ms',
              text: 'Total CPU Time'
            },
            {
              key: 'scripting',
              granularity: 1,
              itemType: 'ms',
              text: 'Script Evaluation'
            },
            {
              key: 'scriptParseCompile',
              granularity: 1,
              itemType: 'ms',
              text: 'Script Parse'
            }
          ],
          items: [
            {
              url: 'chrome-extension://knegfjlikigffbkepibngpeakdhpcmia/h1.js',
              total: 1010.9669999999991,
              scripting: 735.5439999999991,
              scriptParseCompile: 274.376
            }
          ]
        }
      }
    },
    categories: {
      ...lhResult.categories,
      exthouse: {
        title: 'Extension Impact',
        description: 'These audits highlight negative impact of the extension on user experience.',
        id: 'exthouse',
        score: 0.46,
        auditRefs: [
          {
            id: 'exthouse-new-long-tasks',
            weight: 1
          },
          {
            id: 'exthouse-max-potenctialfid-change',
            weight: 1
          },
          {
            id: 'exthouse-scripting',
            weight: 0
          }
        ]
      }
    }
  }
}
