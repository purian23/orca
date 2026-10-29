import type * as Monaco from 'monaco-editor'
import type { LanguageRegistration } from 'shiki/core'
import { registerTextMateLanguage } from './textmate-language-registration'

// Why: Monaco's vs/vs-dark themes only color Monarch-style tokens, so TextMate-only scopes need their nearest rule.
function mapQmlTokenScopes(scopes: readonly string[]): string {
  const scope = scopes.at(-1) ?? 'source.qml'
  if (scope.startsWith('punctuation.definition.string.')) {
    return 'string.qml'
  }
  if (scope.startsWith('constant.numeric.')) {
    return 'number.qml'
  }
  if (scope.startsWith('constant.character.escape.')) {
    return 'string.escape.qml'
  }
  if (scope.startsWith('storage.type.') || scope.startsWith('storage.modifier.')) {
    return 'keyword.qml'
  }
  if (
    scope.startsWith('entity.name.type.') ||
    scope.startsWith('support.class.') ||
    scope.startsWith('support.type.')
  ) {
    return 'type.qml'
  }
  return scope
}

const BLOCK_VALUE_BEGIN = '(?<=\\w)\\s*:(?=\\s*\\{?\\s*$)'

// Why: Shiki's block-value rule opens on any trailing `:` and closes only at `}`, so a bare `color:` with its expression on the next line leaves the rest of the object plain.
function splitBareColonValueRule(qml: LanguageRegistration): LanguageRegistration {
  const attributesValue = qml.repository['attributes-value']
  if (!attributesValue?.patterns) {
    return qml
  }
  const patterns = attributesValue.patterns.flatMap((rule) =>
    rule.begin === BLOCK_VALUE_BEGIN
      ? [
          { ...rule, begin: '(?<=\\w)\\s*:(?=\\s*\\{\\s*$)' },
          {
            begin: '(?<=\\w)\\s*:\\s*$',
            // Ends after a next-line `{...}` block or the first non-blank continuation line.
            end: '(?<=})|(?!\\G)(?<=[^\\s{])\\s*$',
            contentName: 'meta.embedded.line.js',
            patterns: [...(rule.patterns ?? []), { include: 'source.js' }]
          }
        ]
      : [rule]
  )
  const repository = { ...qml.repository }
  repository['attributes-value'] = { ...attributesValue, patterns }
  return { ...qml, repository }
}

// Why: Shiki's QML grammar embeds JavaScript for bindings and handlers, so its JS grammar must load with it.
export async function loadQmlTextMateGrammars(): Promise<LanguageRegistration[]> {
  const { default: grammars } = await import('shiki/langs/qml.mjs')
  return grammars.map((grammar) =>
    grammar.name === 'qml' ? splitBareColonValueRule(grammar) : grammar
  )
}

export function registerQmlLanguage(monaco: Pick<typeof Monaco, 'languages'>): void {
  registerTextMateLanguage(monaco, {
    language: { id: 'qml', extensions: ['.qml'], aliases: ['QML', 'qml'] },
    configuration: {
      comments: { lineComment: '//', blockComment: ['/*', '*/'] },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string', 'comment'] },
        { open: "'", close: "'", notIn: ['string', 'comment'] },
        { open: '`', close: '`', notIn: ['string', 'comment'] }
      ]
    },
    loadGrammar: loadQmlTextMateGrammars,
    mapTokenScopes: mapQmlTokenScopes
  })
}
