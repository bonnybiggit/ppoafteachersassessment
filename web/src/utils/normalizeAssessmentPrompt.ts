type DisplayOption = { readonly id: string; readonly label: string }

/** Remove only a complete, exact duplicate option paragraph at the end. */
export function normalizeAssessmentPrompt(prompt: string, options: readonly DisplayOption[]): string {
  if (options.length === 0 || new Set(options.map(option => option.id)).size !== options.length) return prompt
  if (options.some(option => !option.id || !option.label || /[\r\n]/.test(option.id + option.label))) return prompt

  // Bank options occupy their own final paragraph. Require that boundary so
  // scenario references and numbered instructions elsewhere remain intact.
  const boundaries = [...prompt.matchAll(/\r?\n\r?\n/g)]
  const boundary = boundaries.at(-1)
  if (!boundary || boundary.index === undefined) return prompt
  const stem = prompt.slice(0, boundary.index)
  if (!stem.trim()) return prompt
  const candidate = prompt.slice(boundary.index + boundary[0].length).split(/\r?\n/)
  if (candidate.length !== options.length) return prompt
  const matches = candidate.every((line, index) => {
    const option = options[index]
    return line === `${option.id}. ${option.label}`
  })
  return matches ? stem : prompt
}
