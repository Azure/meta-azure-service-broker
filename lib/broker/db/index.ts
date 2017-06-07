var Sqlserver = require('./sqlserver');

export function Database(opts: any) {
  let db = new Sqlserver(opts);

  db.instanceTableName = 'instances';
  db.bindingTableName = 'bindings';
  return db;
}
