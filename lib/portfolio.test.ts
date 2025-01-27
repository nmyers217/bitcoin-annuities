import { parseISO } from 'date-fns'

import { type PriceData } from '@/lib/api'
import {
  iterateMonths,
  parsePortfolioDate,
  portfolioReducer,
  recalculatePortfolio,
  type Annuity,
  type PortfolioState,
} from './portfolio'

describe('Portfolio Management', () => {
  // Sample test data
  const samplePriceData: PriceData[] = [
    { date: '2024-01-01', price: 40000 },
    { date: '2024-02-01', price: 42000 },
    { date: '2024-03-01', price: 45000 },
    { date: '2024-04-01', price: 43000 },
    { date: '2024-05-01', price: 41000 },
    { date: '2024-06-01', price: 40000 },
  ]

  const sampleAnnuity: Annuity = {
    id: 'test-annuity-1',
    createdAt: '2024-01-01',
    principal: 100000,
    principalCurrency: 'USD',
    amortizationRate: 0.12, // 12% annual rate
    termMonths: 4,
  }

  const initialState: PortfolioState = {
    priceData: [],
    annuities: [],
    cashFlows: [],
    valuations: [],
    calculationStatus: 'idle',
  }

  describe('parsePortfolioDate', () => {
    it('should parse a string date', () => {
      const result = parsePortfolioDate('2024-01-01')
      expect(result).toEqual(parseISO('2024-01-01'))
    })

    it('should parse a string date with MM/DD/YYYY format', () => {
      const result = parsePortfolioDate('01/01/2024')
      expect(result).toEqual(parseISO('2024-01-01'))
    })

    it('should parse a Date object', () => {
      const result = parsePortfolioDate(new Date('2024-01-01'))
      expect(result).toEqual(new Date('2024-01-01'))
    })

    it('properly converts to UTC', () => {
      const result = parsePortfolioDate('2024-01-01T06:00:00-06:00')
      expect(result).toEqual(parseISO('2024-01-01T12:00:00.000Z'))
    })
  })

  describe('iterateMonths', () => {
    it('should return the correct number of months', () => {
      const result = Array.from(iterateMonths(parseISO('2024-01-01'), 4))
      expect(result).toHaveLength(4)
      expect(result[0]).toEqual(parseISO('2024-02-01'))
      expect(result[1]).toEqual(parseISO('2024-03-01'))
      expect(result[2]).toEqual(parseISO('2024-04-01'))
      expect(result[3]).toEqual(parseISO('2024-05-01'))
    })

    it('should return the correct number of months if the start date is in the middle of the month', () => {
      const result = Array.from(iterateMonths(parseISO('2024-11-15'), 5))
      expect(result).toHaveLength(5)
      expect(result[0]).toEqual(parseISO('2024-12-01'))
      expect(result[1]).toEqual(parseISO('2025-01-01'))
      expect(result[2]).toEqual(parseISO('2025-02-01'))
      expect(result[3]).toEqual(parseISO('2025-03-01'))
      expect(result[4]).toEqual(parseISO('2025-04-01'))
    })
  })

  describe('portfolioReducer', () => {
    it('should initialize with price data', () => {
      const action = { type: 'INITIALIZE' as const, priceData: samplePriceData }
      const newState = portfolioReducer(initialState, action)

      expect(newState.priceData).toEqual(samplePriceData)
      expect(newState.cashFlows).toEqual([])
      expect(newState.valuations).toEqual([])
    })

    it('should add an annuity and calculate cash flows', () => {
      const stateWithPrices = {
        ...initialState,
        priceData: samplePriceData,
      }

      const action = { type: 'ADD_ANNUITY' as const, annuity: sampleAnnuity }
      const newState = portfolioReducer(stateWithPrices, action)

      expect(newState.annuities).toHaveLength(1)
      expect(newState.annuities[0]).toEqual(sampleAnnuity)
      expect(newState.calculationStatus).toBe('calculating')
    })

    it('should remove an annuity', () => {
      const stateWithAnnuity = {
        ...initialState,
        priceData: samplePriceData,
        annuities: [sampleAnnuity],
      }

      const action = { type: 'REMOVE_ANNUITY' as const, id: sampleAnnuity.id }
      const newState = portfolioReducer(stateWithAnnuity, action)

      expect(newState.annuities).toHaveLength(0)
      expect(newState.cashFlows).toHaveLength(0)
      expect(newState.calculationStatus).toBe('calculating')
    })

    it('should update an annuity', () => {
      const stateWithAnnuity = {
        ...initialState,
        priceData: samplePriceData,
        annuities: [sampleAnnuity],
      }

      const action = {
        type: 'UPDATE_ANNUITY' as const,
        annuity: { ...sampleAnnuity, principal: 150000 },
      }
      const newState = portfolioReducer(stateWithAnnuity, action)

      expect(newState.annuities[0].principal).toBe(150000)
      expect(newState.calculationStatus).toBe('calculating')
    })

    it('calculates cash flows and valuations', async () => {
      const stateWithAnnuity = {
        ...initialState,
        priceData: samplePriceData,
        annuities: [sampleAnnuity],
      }
      const mockDispatch = jest.fn()

      await recalculatePortfolio(stateWithAnnuity, mockDispatch)

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'START_CALCULATION',
        inputHash: expect.any(String),
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'CALCULATION_COMPLETE',
        inputHash: expect.any(String),
        cashFlows: expect.any(Array),
        valuations: expect.any(Array),
      })

      const newState = mockDispatch.mock.calls[1][0]

      expect(newState.cashFlows.length).toBeGreaterThan(0)

      // Verify inflow
      const inflow = newState.cashFlows.find((cf) => cf.type === 'inflow')
      expect(inflow).toBeDefined()
      expect(inflow?.usdAmount).toBe(100000)
      expect(inflow?.btcAmount).toBe(2.5) // 100000 / 40000

      // Verify outflows
      const outflows = newState.cashFlows.filter((cf) => cf.type === 'outflow')
      expect(outflows).toHaveLength(4)
      // Check outflow dates
      expect(outflows.map((cf) => cf.date)).toEqual([
        '2024-02-01',
        '2024-03-01',
        '2024-04-01',
        '2024-05-01',
      ])
      expect(outflows.map((cf) => cf.btcAmount)).toEqual([
        0.6101930807420477, 0.5695135420259112, 0.5960025439806047,
        0.6250758388089269,
      ])
      expect(outflows.map((cf) => cf.usdAmount)).toEqual([
        25628.109391166003, 25628.109391166003, 25628.109391166003,
        25628.109391166003,
      ])

      expect(newState.valuations).toHaveLength(5)

      // Calculate expected BTC values
      const expectedBTCValues = [
        2.5, // Initial: 100k/40k
        1.89, // After Feb payment: 2.5 - (25628/42000)
        1.32, // After Mar payment: 1.89 - (25628/45000)
        0.72, // After Apr payment: 1.32 - (25628/43000)
        0.1, // After May payment: 0.72 - (25628/41000)
      ]
      const expectedUSDValues = [100000, 79371.89, 59413.2, 31144.51, 4067.81]

      expect(
        newState.valuations.map((v) => Number(v.btcValue.toFixed(2)))
      ).toEqual(expectedBTCValues)
      expect(
        newState.valuations.map((v) => Number(v.usdValue.toFixed(2)))
      ).toEqual(expectedUSDValues)
    })
  })
})
