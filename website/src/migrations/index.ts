import * as migration_20261006_175150_initial from './20261006_175150_initial';
import * as migration_20261009_003242_stage_2_content from './20261009_003242_stage_2_content';
import * as migration_20261009_003252_starting_data from './20261009_003252_starting_data';

export const migrations = [
  {
    up: migration_20261006_175150_initial.up,
    down: migration_20261006_175150_initial.down,
    name: '20261006_175150_initial',
  },
  {
    up: migration_20261009_003242_stage_2_content.up,
    down: migration_20261009_003242_stage_2_content.down,
    name: '20261009_003242_stage_2_content',
  },
  {
    up: migration_20261009_003252_starting_data.up,
    down: migration_20261009_003252_starting_data.down,
    name: '20261009_003252_starting_data'
  },
];
