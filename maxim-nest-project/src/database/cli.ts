import { createDataSource } from './data-source.js';
import { seed } from './seed.js';
const db = await createDataSource().initialize();
try {
  switch (process.argv[2]) {
    case 'migrate':
      console.log(await db.runMigrations());
      break;
    case 'revert':
      await db.undoLastMigration();
      break;
    case 'seed':
      await seed(db, process.argv[3] === 'large');
      break;
    default:
      throw new Error('Expected migrate, revert or seed [large]');
  }
} finally {
  await db.destroy();
}
