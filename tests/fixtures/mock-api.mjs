// A stand-in for the Ravino backend's public API, serving the recorded contract fixtures from memory.
// Content can be changed while it runs (POST /__state), which is how the webhook test edits "the CMS".
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'api')
const load = (name) => JSON.parse(readFileSync(path.join(dir, `${name}.json`), 'utf8'))
let down = false
const state = { projects: { en: load('projects-en'), fa: load('projects-fa') }, site: { en: load('site-en'), fa: load('site-fa') } }

function apply(change) {
  if (typeof change.down === 'boolean') down = change.down
  for (const locale of ['en', 'fa']) {
    if (change.phone) state.site[locale].data.contact.phone = change.phone
    if (change.social) state.site[locale].data.social = change.social
    if (change.addProject) {
      const copy = structuredClone(state.projects[locale].data[0])
      Object.assign(copy, { id: change.addProject, slug: change.addProject, title: `${copy.title} (${change.addProject})` })
      state.projects[locale].data.push(copy)
      state.projects[locale].meta.total = state.projects[locale].data.length
    }
    if (change.removeProject) {
      state.projects[locale].data = state.projects[locale].data.filter((p) => p.slug !== change.removeProject)
      state.projects[locale].meta.total = state.projects[locale].data.length
    }
  }
}

export function startMockApi(port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://mock')
    const json = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(body))
    }
    if (req.method === 'POST' && url.pathname === '/__state') {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => {
        apply(JSON.parse(raw))
        json(200, { ok: true })
      })
      return
    }
    const match = url.pathname.match(/^\/api\/v1\/(en|fa)\/(projects|site)$/)
    if (req.method === 'GET' && match) return down ? json(503, { error: { code: 'unavailable' } }) : json(200, state[match[2]][match[1]])
    json(404, { error: { code: 'not_found' } })
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await startMockApi(Number(process.env.MOCK_API_PORT ?? 4010))
  console.log('mock API listening')
}
