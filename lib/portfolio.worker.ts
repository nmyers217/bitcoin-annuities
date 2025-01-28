import * as Comlink from 'comlink'

import { performCalculations } from './calculations'

const worker = {
  calculate: (...args: Parameters<typeof performCalculations>) => {
    console.log('Worker starting calculation with:', {
      priceDataLength: args[0].length,
      annuitiesLength: args[1].length,
      hasMonteCarloData: !!args[2],
    })

    try {
      const result = performCalculations(...args)
      console.log('Worker calculation complete:', {
        cashFlowsLength: result.cashFlows.length,
        valuationsLength: result.valuations.length,
      })
      return result
    } catch (error) {
      console.error('Worker calculation failed:', error)
      throw error
    }
  },
}

Comlink.expose(worker)
