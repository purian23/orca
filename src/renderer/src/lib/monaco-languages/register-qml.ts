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
  if (scope.startsWith('entity.name.type.') || scope.startsWith('support.class.')) {
    return 'type.qml'
  }
  return scope
}

// Why: Shiki's QML grammar embeds JavaScript for bindings and handlers, so its JS grammar must load with it.
export async function loadQmlTextMateGrammars(): Promise<LanguageRegistration[]> {
  const { default: grammars } = await import('shiki/langs/qml.mjs')
  return [...grammars]
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
