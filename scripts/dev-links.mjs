const localServices = [
  ['Web', 'http://localhost:3000'],
  ['API health', 'http://localhost:4000/health/ready'],
  ['Worker health', 'http://localhost:4001/health/ready'],
];

console.log('\nIncidentLens local services (open after startup completes):');

for (const [name, url] of localServices) {
  console.log(`  ${name}: ${url}`);
}

console.log('');
