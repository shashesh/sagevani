import * as migration_20261006_175150_initial from './20261006_175150_initial';

export const migrations = [
  {
    up: migration_20261006_175150_initial.up,
    down: migration_20261006_175150_initial.down,
    name: '20261006_175150_initial'
  },
];
