import * as Comlink from 'comlink'

import { performCalculations } from './portfolio'

const worker = {
  calculate: performCalculations,
}

Comlink.expose(worker)
