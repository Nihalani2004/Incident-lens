import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const repositoryRoot = new URL('../', import.meta.url);

async function packageManifestPaths() {
  const paths = ['contracts/package.json'];
  for (const directory of ['apps', 'packages']) {
    const entries = await readdir(new URL(`${directory}/`, repositoryRoot), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isDirectory()) paths.push(`${directory}/${entry.name}/package.json`);
    }
  }
  return paths.sort();
}

async function readManifest(path) {
  return JSON.parse(await readFile(new URL(path, repositoryRoot), 'utf8'));
}

function internalDependencies(manifest) {
  return Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  }).filter((dependency) => dependency.startsWith('@incidentlens/'));
}

function findCycle(graph) {
  const visited = new Set();
  const active = new Set();
  const stack = [];

  function visit(name) {
    if (active.has(name)) {
      const start = stack.indexOf(name);
      return [...stack.slice(start), name];
    }
    if (visited.has(name)) return undefined;

    visited.add(name);
    active.add(name);
    stack.push(name);
    for (const dependency of graph.get(name) ?? []) {
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    stack.pop();
    active.delete(name);
    return undefined;
  }

  for (const name of graph.keys()) {
    const cycle = visit(name);
    if (cycle) return cycle;
  }
  return undefined;
}

const manifests = await Promise.all(
  (await packageManifestPaths()).map(async (path) => ({ path, value: await readManifest(path) })),
);
const names = new Set(manifests.map(({ value }) => value.name));
const applicationNames = new Set(
  manifests.filter(({ path }) => path.startsWith('apps/')).map(({ value }) => value.name),
);
const graph = new Map();

for (const { path, value } of manifests) {
  assert.match(value.name, /^@incidentlens\//, `${path} must use the workspace namespace`);
  assert.equal(typeof value.scripts?.build, 'string', `${value.name} must define build`);
  assert.equal(typeof value.scripts?.typecheck, 'string', `${value.name} must define typecheck`);
  assert.equal(
    typeof value.scripts?.['test:unit'],
    'string',
    `${value.name} must define test:unit`,
  );

  const dependencies = internalDependencies(value);
  for (const dependency of dependencies) {
    assert.equal(names.has(dependency), true, `${value.name} references unknown ${dependency}`);
    if (!path.startsWith('apps/')) {
      assert.equal(
        applicationNames.has(dependency),
        false,
        `${value.name} must not depend on application package ${dependency}`,
      );
    }
  }
  graph.set(value.name, dependencies);
}

const cycle = findCycle(graph);
assert.equal(cycle, undefined, `Workspace dependency cycle: ${cycle?.join(' -> ')}`);

const rootPackage = await readManifest('package.json');
assert.match(rootPackage.scripts?.['dev:poll'] ?? '', /WATCHPACK_POLLING=true/);
assert.match(rootPackage.scripts?.['dev:poll'] ?? '', /TSC_WATCHFILE=DynamicPriorityPolling/);

process.stdout.write(`Validated ${manifests.length} package boundaries with no cycles.\n`);
