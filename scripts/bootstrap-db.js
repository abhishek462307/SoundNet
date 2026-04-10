const { createDbAdapter } = require('../models/db');

async function main() {
  await createDbAdapter();
  console.log('Database bootstrap complete');
}

main().catch((error) => {
  console.error('Database bootstrap failed', error);
  process.exit(1);
});
